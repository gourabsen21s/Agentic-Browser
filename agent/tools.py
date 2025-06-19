# agent/tools.py
from langchain.tools import tool
# No need for json import if tools take multiple args

@tool
def open_url(url: str) -> str:
    """Navigates the browser to the specified URL.
    Input should be a fully qualified URL including http:// or https://.
    Example: "https://www.google.com"
    """
    print(f"[AGENT_TOOL] Called open_url with URL: {url}")
    return f"Browser navigated to {url}. Page loaded."

@tool
def click_element(selector: str, description: str = "") -> str:
    """Clicks on a web element identified by its CSS selector.
    The selector should be a valid CSS selector (e.g., "#search-button", ".login-btn", "div.item").
    Optionally, provide a brief description of the element to help the agent confirm its choice.
    """
    print(f"[AGENT_TOOL] Called click_element with selector: {selector}, description: {description}")
    return f"Clicked on element with selector {selector}."

@tool
def type_text(selector: str, text: str, description: str = "") -> str:
    """Types the specified text into an input field identified by its CSS selector.
    The selector should be a valid CSS selector for an input field.
    Example: "input#username", "textarea.comment-box".
    """
    print(f"[AGENT_TOOL] Called type_text with selector: {selector}, text: '{text}', description: {description}")
    return f"Typed '{text}' into element with selector {selector}."

@tool
def read_page_content(query: str = "") -> str:
    """Reads and summarizes the visible text content of the current page.
    Optionally provide a query to focus the summary on a specific topic or keyword.
    This tool returns a summary of the most relevant text on the page.
    """
    print(f"[AGENT_TOOL] Called read_page_content with query: '{query}'")
    return "The page contains a search bar, a login button, and some links related to news."