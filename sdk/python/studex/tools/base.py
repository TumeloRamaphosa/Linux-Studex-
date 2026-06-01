"""
Base tool abstractions matching Google ADK's @tool decorator pattern.

Usage:
    from studex.tools import tool

    @tool
    def get_weather(location: str) -> str:
        \"\"\"Get the weather for a location.\"\"\"
        return f"Weather for {location}: sunny, 72°F"

    # Register with an agent
    # agent.add_tool(get_weather)
"""

from __future__ import annotations

import inspect
from typing import Any, Callable, Dict, List, Optional, get_type_hints


class Tool:
    """
    A tool definition matching Google ADK's Tool class.

    Wraps a Python function with metadata for tool discovery
    and MCP compatibility.
    """

    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.name = name
        self.description = description
        self.handler = handler
        self.parameters = parameters or {}

    def to_mcp_format(self) -> Dict[str, Any]:
        """Convert to MCP-compatible tool format."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": self.parameters,
                "required": [
                    k for k, v in self.parameters.items()
                    if isinstance(v, dict) and v.get("required", False)
                ],
            },
        }

    def execute(self, **kwargs: Any) -> Any:
        """Execute the tool handler with given arguments."""
        return self.handler(**kwargs)

    def __repr__(self) -> str:
        return f"<Tool {self.name}: {self.description[:40]}...>"


def tool(func: Callable) -> Tool:
    """
    Decorator that converts a function into a Tool.

    Automatically extracts parameter schemas from type hints.

    Usage:
        @tool
        def greet(name: str, age: int = 0) -> str:
            \"\"\"Greet a person.\"\"\"
            return f"Hello {name}, age {age}"

    Args:
        func: The function to wrap as a tool

    Returns:
        Tool instance wrapping the function
    """
    name = func.__name__
    description = func.__doc__ or f"Call {name}"
    sig = inspect.signature(func)
    hints = get_type_hints(func) if hasattr(func, "__annotations__") else {}

    parameters = {}
    for param_name, param in sig.parameters.items():
        param_type = hints.get(param_name, str)
        type_name = _type_to_str(param_type)

        param_schema: Dict[str, Any] = {
            "type": type_name,
            "description": f"Parameter {param_name}",
        }
        if param.default is not inspect.Parameter.empty:
            param_schema["default"] = param.default
        else:
            param_schema["required"] = True

        parameters[param_name] = param_schema

    return Tool(
        name=name,
        description=description.strip(),
        handler=func,
        parameters=parameters,
    )


def _type_to_str(t: Any) -> str:
    """Convert a Python type to a JSON Schema type string."""
    mapping = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
        type(None): "null",
    }
    origin = getattr(t, "__origin__", None)
    if origin is list:
        return "array"
    if origin is dict:
        return "object"
    if origin is Optional or origin is type(None):
        return "string"
    return mapping.get(t, "string")


class ToolRegistry:
    """
    Registry for managing multiple tools.

    Matches Google ADK's SkillToolset pattern for aggregating tools
    from multiple sources.
    """

    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    def register(self, tool_def: Tool) -> None:
        """Register a tool in the registry."""
        self._tools[tool_def.name] = tool_def

    def register_func(self, func: Callable) -> Tool:
        """Register a function as a tool (wraps with @tool logic)."""
        t = func if isinstance(func, Tool) else tool(func)
        self._tools[t.name] = t
        return t

    def get(self, name: str) -> Optional[Tool]:
        """Get a tool by name."""
        return self._tools.get(name)

    def list(self) -> List[Tool]:
        """List all registered tools."""
        return list(self._tools.values())

    def to_mcp_list(self) -> List[Dict[str, Any]]:
        """Export all tools in MCP-compatible format."""
        return [t.to_mcp_format() for t in self._tools.values()]

    def __len__(self) -> int:
        return len(self._tools)

    def __repr__(self) -> str:
        return f"<ToolRegistry ({len(self)} tools)>"


# Alias
BaseTool = Tool
