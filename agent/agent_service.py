from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.prompts import MessagesPlaceholder
from langchain.memory import ConversationBufferMemory

from .tools import open_url, click_element, type_text, read_page_content

load_dotenv()

app = FastAPI(
    title="Agent Service",
    description="LangChain agent to process prompts and determine actions."
)

_agent_executor = None


def _initialize_agent():
    global _agent_executor
    if _agent_executor is None:
        print("[AGENT_SERVICE] Initializing LangChain Agent with OpenRouter...")

        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        openrouter_base_url = os.getenv("OPENROUTER_BASE_URL")

        if not openrouter_api_key or not openrouter_base_url:
            raise ValueError("Both OPENROUTER_API_KEY and OPENROUTER_BASE_URL must be set in .env")

        llm = ChatOpenAI(
            model="tngtech/deepseek-r1t-chimera:free", 
            temperature=0,
            api_key=openrouter_api_key,
            base_url=openrouter_base_url,
        )

        tools = [open_url, click_element, type_text, read_page_content]

        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

        _agent_executor = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            verbose=True,
            agent_kwargs={
                "extra_prompt_messages": [MessagesPlaceholder(variable_name="chat_history")]
            },
            memory=memory,
            handle_parsing_errors=True
        )

        print("[AGENT_SERVICE] LangChain Agent initialized with OpenRouter.")

    return _agent_executor


class AgentRequest(BaseModel):
    prompt: str
    current_context: str = ""  


@app.get("/")
async def read_root():
    return {"message": "Agent Service is running!"}


@app.post("/process_prompt")
async def process_prompt_endpoint(request: AgentRequest):
    try:
        agent_instance = _initialize_agent()

        print(f"[AGENT_SERVICE] Processing prompt: '{request.prompt}'")

        response = await agent_instance.ainvoke({"input": request.prompt})

        print(f"[AGENT_SERVICE] Agent response: {response}")

        return {"status": "success", "agent_response": response}

    except Exception as e:
        print(f"[AGENT_SERVICE] Error processing prompt: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")