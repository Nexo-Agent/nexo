use crate::error::AppError;
use crate::models::ParsedPromptTemplate;
use regex::Regex;

const HUB_BASE_URL: &str = "https://raw.githubusercontent.com/Nexo-Agent/official-hub/main";

/// Service to fetch and parse markdown prompt templates from hub
pub struct PromptTemplateService;

impl PromptTemplateService {
    pub fn new() -> Self {
        Self
    }

    /// Fetch markdown file from GitHub raw URL
    pub async fn fetch_prompt_template(&self, path: &str) -> Result<String, AppError> {
        let url = format!("{}/{}", HUB_BASE_URL, path);
        let response = reqwest::get(&url)
            .await
            .map_err(|e| {
                AppError::PromptTemplate(format!("Failed to fetch template from {}: {}", url, e))
            })?;

        if !response.status().is_success() {
            return Err(AppError::PromptTemplate(format!(
                "HTTP {} error when fetching template from {}",
                response.status(),
                url
            )));
        }

        let markdown = response.text().await.map_err(|e| {
            AppError::PromptTemplate(format!("Failed to read response from {}: {}", url, e))
        })?;

        Ok(markdown)
    }

    /// Parse markdown template to extract title, description, content, and variables
    pub fn parse_markdown_template(&self, markdown: &str) -> Result<ParsedPromptTemplate, AppError> {
        // Extract title from first # header
        let title = self.extract_title(markdown)?;

        // Extract description (paragraph after title, before ## Prompt)
        let description = self.extract_description(markdown)?;

        // Extract content from ## Prompt section
        let content = self.extract_prompt_content(markdown)?;

        // Extract variables from content using regex {{variable_name}}
        let variables = self.extract_variables(&content);

        Ok(ParsedPromptTemplate {
            title,
            description,
            content,
            variables,
        })
    }

    /// Extract title from first # header
    fn extract_title(&self, markdown: &str) -> Result<String, AppError> {
        let title_regex = Regex::new(r"^#\s+(.+)$").map_err(|e| {
            AppError::PromptTemplate(format!("Failed to compile title regex: {}", e))
        })?;

        for line in markdown.lines() {
            if let Some(captures) = title_regex.captures(line.trim()) {
                if let Some(title) = captures.get(1) {
                    return Ok(title.as_str().trim().to_string());
                }
            }
        }

        Err(AppError::PromptTemplate(
            "No title found in markdown template".to_string(),
        ))
    }

    /// Extract description (paragraph after title, before ## Prompt)
    fn extract_description(&self, markdown: &str) -> Result<String, AppError> {
        let lines: Vec<&str> = markdown.lines().collect();
        let mut description_lines = Vec::new();
        let mut found_title = false;

        for line in lines {
            let trimmed = line.trim();

            // Skip title line
            if trimmed.starts_with("# ") && !found_title {
                found_title = true;
                continue;
            }

            // Stop at ## Prompt section
            if trimmed.starts_with("## Prompt") {
                break;
            }

            // Collect description lines (non-empty lines after title)
            if found_title && !trimmed.is_empty() {
                description_lines.push(trimmed);
            }
        }

        if description_lines.is_empty() {
            return Ok(String::new());
        }

        Ok(description_lines.join(" ").trim().to_string())
    }

    /// Extract content from ## Prompt section
    fn extract_prompt_content(&self, markdown: &str) -> Result<String, AppError> {
        let lines: Vec<&str> = markdown.lines().collect();
        let mut content_lines = Vec::new();
        let mut in_prompt_section = false;

        for line in lines {
            let trimmed = line.trim();

            // Start collecting at ## Prompt
            if trimmed.starts_with("## Prompt") {
                in_prompt_section = true;
                continue;
            }

            // Stop at next ## section (if any)
            if in_prompt_section && trimmed.starts_with("## ") {
                break;
            }

            // Collect content lines
            if in_prompt_section {
                content_lines.push(line);
            }
        }

        if content_lines.is_empty() {
            return Err(AppError::PromptTemplate(
                "No prompt content found in ## Prompt section".to_string(),
            ));
        }

        // Join lines and trim
        let content = content_lines.join("\n").trim().to_string();

        if content.is_empty() {
            return Err(AppError::PromptTemplate(
                "Prompt content section is empty".to_string(),
            ));
        }

        Ok(content)
    }

    /// Extract variables from content using regex {{variable_name}}
    fn extract_variables(&self, content: &str) -> Vec<String> {
        let variable_regex = Regex::new(r"\{\{(\w+)\}\}").unwrap();
        let mut variables = std::collections::HashSet::new();

        for captures in variable_regex.captures_iter(content) {
            if let Some(var_name) = captures.get(1) {
                variables.insert(var_name.as_str().to_string());
            }
        }

        let mut result: Vec<String> = variables.into_iter().collect();
        result.sort();
        result
    }

}

impl Default for PromptTemplateService {
    fn default() -> Self {
        Self::new()
    }
}
