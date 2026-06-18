use super::spec::ToolSpec;
use crate::models::llm_types::ChatCompletionTool;

pub fn tool_spec_to_llm_tool(spec: &ToolSpec) -> ChatCompletionTool {
    ChatCompletionTool {
        r#type: "function".to_string(),
        function: crate::models::llm_types::ChatCompletionToolFunction {
            name: spec.name.clone(),
            description: spec.description.clone(),
            parameters: spec.parameters.clone(),
        },
    }
}

pub fn tool_specs_to_llm_tools(specs: &[ToolSpec]) -> Vec<ChatCompletionTool> {
    specs.iter().map(tool_spec_to_llm_tool).collect()
}
