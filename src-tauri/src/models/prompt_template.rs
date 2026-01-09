use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedPromptTemplate {
    pub title: String,
    pub description: String,
    pub content: String,
    pub variables: Vec<String>,
}
