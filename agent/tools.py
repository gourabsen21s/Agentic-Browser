from langchain.tools import tool
import json
import requests
import os
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

NODE_SERVER_BASE_URL = f"http://localhost:{os.getenv('NODE_SERVER_PORT', '3000')}"

def _call_node_server_api(endpoint: str, payload: dict) -> str:
    url = f"{NODE_SERVER_BASE_URL}{endpoint}"
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        if result.get('status') == 'success':
            return result.get('message') or result.get('content', 'Action successful.')
        else:
            return f"Node.js server error: {result.get('message', 'Unknown error.')}"
    except requests.exceptions.RequestException as e:
        return f"Error connecting to Node.js server at {url}: {e}"

@tool
def open_url(url: str) -> str:
    """Navigates the browser to the specified URL.
    Input should be a fully qualified URL including http:// or https://.
    Example: "https://www.google.com"
    """
    print(f"[AGENT_TOOL] Called open_url with URL: {url}")
    return _call_node_server_api("/api/browser/navigate", {"url": url})

@tool
def click_element(input_string: str) -> str:
    """Clicks on a web element.
    Input should be a JSON string with 'selector' and optional 'description'.
    Example: '{"selector": "#search-button", "description": "the search form button"}'
    """
    try:
        args = json.loads(input_string)
        selector = args.get("selector")
        description = args.get("description", "")
        if not selector:
            return "Error: Selector is required for click_element."
        print(f"[AGENT_TOOL] Called click_element with selector: {selector}, description: {description}")
        return _call_node_server_api("/api/browser/click", {"selector": selector})
    except json.JSONDecodeError:
        return "Error: Invalid JSON input for click_element. Expected '{\"selector\":\"...\", \"description\":\"...\"}'"
    except Exception as e:
        return f"Error in click_element: {e}"

@tool
def type_text(input_string: str) -> str:
    """Types text into an input field.
    Input should be a JSON string with 'selector', 'text', and optional 'description'.
    Example: '{"selector": "input#username", "text": "my_username", "description": "the username field"}'
    """
    try:
        args = json.loads(input_string)
        selector = args.get("selector")
        text = args.get("text")
        description = args.get("description", "")
        if not selector or text is None:
            return "Error: Selector and text are required for type_text."
        print(f"[AGENT_TOOL] Called type_text with selector: {selector}, text: '{text}', description: {description}")
        return _call_node_server_api("/api/browser/type", {"selector": selector, "text": text})
    except json.JSONDecodeError:
        return "Error: Invalid JSON input for type_text. Expected '{\"selector\":\"...\", \"text\":\"...\", \"description\":\"...\"}'"
    except Exception as e:
        return f"Error in type_text: {e}"

@tool
def read_page_content(query: str = "") -> str:
    """Reads and summarizes the visible text content of the current page based on an optional query.
    If a query is provided, this tool will attempt to filter or summarize the content based on the query.
    """
    print(f"[AGENT_TOOL] Called read_page_content with query: '{query}'")
    selector = "body"
    return _call_node_server_api("/api/browser/read_page", {"selector": selector})

# --- NEW TOOL: scroll_page ---
@tool
def scroll_page(direction: str) -> str:
    """Scrolls the current browser page.
    Input should be a string representing the scroll direction: 'down', 'up', 'bottom', or 'top'.
    Example: "down" to scroll down.
    """
    print(f"[AGENT_TOOL] Called scroll_page with direction: {direction}")
    return _call_node_server_api("/api/browser/scroll", {"direction": direction})

# Note: page_elements_data will be handled by agent_service.py passing to the agent.
# We do not import _last_page_elements directly into tools.py if tools.py is meant to be
# truly independent and called by the agent with passed context.
# However, for the current setup where _last_page_elements is a global in agent_service,
# and get_elements_from_page needs it, we can keep that import in get_elements_from_page.

# --- Re-add get_elements_from_page with the correct import approach ---
# Moved the import statement to within the function for better modularity
# or ensure it's imported at the top of tools.py if `_last_page_elements` is always global.
# For now, assuming `_last_page_elements` is still handled as a global in agent_service.py
# This might require passing elements explicitly to the agent's run method or making agent_service
# pass them to the tool in a more direct way.
# Let's keep the global import in the function as previously discussed for simplicity.
@tool
def get_elements_from_page(query: str = "") -> str:
    """Examines the current page and returns a concise list of actionable elements (buttons, inputs, links, text).
    Provide a `query` (e.g., "all buttons", "search bar", "login form", "elements related to 'product'").
    The tool will filter elements based on the query and return relevant `selector`s and `text`.
    If no query, it attempts to return a general overview of important interactive elements.
    """
    # This needs to access _last_page_elements from agent_service.py's global state
    from agent.agent_service import _last_page_elements as page_elements_data # Keep this import here

    if not page_elements_data:
        print("[AGENT_TOOL] get_elements_from_page: No page elements available.")
        return "No page elements found on the current screen."

    relevant_elements = []
    query_lower = query.lower() if query else ""

    for el in page_elements_data:
        el_text = (el.get('ocrText') or el.get('textContent') or '').lower()
        el_selector = el.get('selector', '').lower()
        el_tag = el.get('tagName', '').lower()

        is_interactive_tag = el_tag in ['button', 'a', 'input', 'select', 'textarea']

        # Prioritize elements that are explicitly interactive or OCR-matched with some text
        if el.get('matchedByOcr') and (is_interactive_tag or el_text):
            if query:
                if query_lower in el_text or \
                   query_lower in el_selector or \
                   query_lower in el_tag:
                   relevant_elements.append(el)
            else:
                relevant_elements.append(el)
        elif is_interactive_tag and not query: # Also include interactive elements even if not OCR-matched, if no query
            relevant_elements.append(el)

    # Fallback if specific query didn't yield results, broaden search slightly
    if not relevant_elements and query:
        for el in page_elements_data:
            el_text = (el.get('ocrText') or el.get('textContent') or '').lower()
            el_selector = el.get('selector', '').lower()
            el_tag = el.get('tagName', '').lower()
            if (el_text and query_lower in el_text) or \
               (query_lower in el_selector) or \
               (query_lower in el_tag):
                relevant_elements.append(el)

    if not relevant_elements:
        print(f"[AGENT_TOOL] get_elements_from_page: No relevant elements found for query: '{query}'")
        return "No relevant interactive elements found for the given query or on the page."

    formatted_elements = []
    for el in relevant_elements:
        description_parts = []
        if el.get('tagName'): description_parts.append(f"Tag: {el['tagName']}")
        if el.get('id'): description_parts.append(f"ID: #{el['id']}")
        if el.get('className'): description_parts.append(f"Class: .{el['className'].split(' ')[0]}")
        if el.get('ocrText') and el.get('ocrSimilarity', 0) > 0.7:
            description_parts.append(f"OCR Text: '{el['ocrText']}' (Conf: {el['ocrConfidence']:.2f})")
        elif el.get('textContent'):
            desc_text = el['textContent'].replace('\n', ' ').strip()
            if len(desc_text) > 50: desc_text = desc_text[:47] + '...'
            description_parts.append(f"DOM Text: '{desc_text}'")

        best_selector = el.get('selector') or (el.get('id') and f"#{el['id']}") or \
                        (el.get('className') and f".{el['className'].split(' ')[0]}") or \
                        el.get('tagName')

        formatted_elements.append(f"  - Selector: '{best_selector}', Desc: {'; '.join(description_parts)}")

        if len(formatted_elements) >= 20: # Limit for brevity in LLM context
            formatted_elements.append("... (more elements available, refine query if needed)")
            break

    final_response = f"Found {len(relevant_elements)} elements. Here is a summary:\n" + "\n".join(formatted_elements)
    print(f"[AGENT_TOOL] get_elements_from_page: Returning {len(relevant_elements)} elements summary.")
    return final_response