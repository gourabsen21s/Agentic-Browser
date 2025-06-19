# agent/agent_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from typing import List, Dict, Any

from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.prompts import MessagesPlaceholder
from langchain.memory import ConversationBufferMemory


from .tools import open_url, click_element, type_text, read_page_content, get_elements_from_page, scroll_page

load_dotenv()

app = FastAPI(
    title="Agent Service",
    description="LangChain agent to process prompts and determine actions."
)

_agent_executor = None

_last_page_elements: List[Dict[str, Any]] = [] 

def _initialize_agent():
    global _agent_executor
    if _agent_executor is None:
        print("[AGENT_SERVICE] Initializing LangChain Agent with OpenRouter...")

        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        openrouter_base_url = os.getenv("OPENROUTER_BASE_URL")

        if not openrouter_api_key or not openrouter_base_url:
            raise ValueError("Both OPENROUTER_API_KEY and OPENROUTER_BASE_URL must be set in .env")

        llm = ChatOpenAI(
            # Use a reliable DeepSeek model for tool calling that worked for multi-step prompts
            model="deepseek/deepseek-chat", # OR "deepseek/r1-0528" if you prefer
            temperature=0, # Keep temperature low for deterministic agent behavior
            api_key=openrouter_api_key,
            base_url=openrouter_base_url,
        )

        # Define the tools available to the agent
        tools = [
            open_url,
            click_element,
            type_text,
            read_page_content,
            get_elements_from_page, # Tool to expose page elements to LLM
            scroll_page # Tool to enable scrolling
        ]

        # Set up memory
        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

        # Initialize the agent
        # STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION worked for multi-step with DeepSeek
        _agent_executor = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
            verbose=True, # Shows agent's thought process in console
            agent_kwargs={
                "extra_prompt_messages": [MessagesPlaceholder(variable_name="chat_history")]
            },
            memory=memory, # Pass the memory instance to the agent
            handle_parsing_errors=True # Crucial for robustness
        )

        print("[AGENT_SERVICE] LangChain Agent initialized with OpenRouter.")

    return _agent_executor


class AgentRequest(BaseModel):
    prompt: str
    current_context: str = ""
    # This field receives the merged elements from the Node.js server
    page_elements: List[Dict[str, Any]] = [] 

@app.get("/")
async def read_root():
    return {"message": "Agent Service is running!"}


@app.post("/process_prompt")
async def process_prompt_endpoint(request: AgentRequest):
    global _last_page_elements # Declare global to modify the variable
    try:
        agent_instance = _initialize_agent()

        # Store the incoming page elements in the global variable for tools to access
        _last_page_elements = request.page_elements 
        print(f"[AGENT_SERVICE] Received {len(request.page_elements)} page elements for prompt: '{request.prompt}'.")

        # Process the prompt with the agent
        response = await agent_instance.ainvoke({"input": request.prompt})

        print(f"[AGENT_SERVICE] Agent response: {response}")

        # Return the agent's structured output
        return {"status": "success", "agent_response": response}

    except Exception as e:
        print(f"[AGENT_SERVICE] Error processing prompt: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for debugging
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")