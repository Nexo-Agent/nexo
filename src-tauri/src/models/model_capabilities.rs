//! Unified heuristic detection for LLM feature support (input modalities, tools, thinking, image gen).
//!
//! Patterns are derived from official provider documentation and updated for 2026 model families.

use super::llm_types::LLMModel;

/// Input modality support (what the user can attach to a prompt).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ModelInputCapabilities {
    pub image: bool,
    pub document: bool,
    pub audio: bool,
    pub video: bool,
}

impl ModelInputCapabilities {
    pub fn any(&self) -> bool {
        self.image || self.document || self.audio || self.video
    }
}

/// Feature support flags for a model, used across backend and serialized on `LLMModel`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ModelCapabilities {
    pub input: ModelInputCapabilities,
    pub tools: bool,
    pub thinking: bool,
    pub image_generation: bool,
    pub text_extraction: bool,
}

impl ModelCapabilities {
    pub fn apply_to_model(&self, model: &mut LLMModel) {
        model.supports_image_input = self.input.image;
        model.supports_document_input = self.input.document;
        model.supports_audio_input = self.input.audio;
        model.supports_video_input = self.input.video;
        model.supports_text_extraction = self.text_extraction;
        model.supports_tools = self.tools;
        model.supports_thinking = self.thinking;
        model.supports_image_generation = self.image_generation;
    }
}

/// Override input flags when provider metadata lists supported modalities (e.g. OpenRouter).
pub fn apply_input_modalities(input: &mut ModelInputCapabilities, modalities: &[&str]) {
    if modalities.is_empty() {
        return;
    }

    let lower: Vec<String> = modalities.iter().map(|m| m.to_lowercase()).collect();

    input.image = lower.iter().any(|m| m == "image");
    input.document = lower.iter().any(|m| m == "file" || m == "document");
    input.audio = lower.iter().any(|m| m == "audio");
    input.video = lower.iter().any(|m| m == "video");
}

/// Strip provider prefix (`openrouter/...`) and Gemini `models/` prefix, lowercase.
pub fn normalize_model_id(model_id: &str) -> String {
    let clean = model_id.split('/').next_back().unwrap_or(model_id);
    clean
        .strip_prefix("models/")
        .unwrap_or(clean)
        .to_lowercase()
}

/// Detect all capability flags from a model id string.
pub fn detect_model_capabilities(model_id: &str) -> ModelCapabilities {
    let model_lower = normalize_model_id(model_id);

    if model_lower.is_empty() {
        return ModelCapabilities::default();
    }

    let image_generation = is_image_generation_model(&model_lower);

    if image_generation {
        return ModelCapabilities {
            input: ModelInputCapabilities {
                image: supports_image_input_for_image_model(&model_lower),
                document: false,
                audio: false,
                video: false,
            },
            tools: false,
            thinking: false,
            image_generation: true,
            text_extraction: false,
        };
    }

    ModelCapabilities {
        input: detect_input_capabilities(&model_lower),
        tools: supports_tools(&model_lower),
        thinking: supports_thinking(&model_lower),
        image_generation: false,
        text_extraction: supports_text_extraction_for_input(&model_lower),
    }
}

/// Models without native document input can receive attachments via extract-to-text.
pub fn supports_text_extraction(model_id: &str) -> bool {
    detect_model_capabilities(model_id).text_extraction
}

fn supports_text_extraction_for_input(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }
    !supports_document_input(model_lower)
}

/// Returns whether a model is known to support tool/function calling.
pub fn model_supports_tools(model_id: &str) -> bool {
    detect_model_capabilities(model_id).tools
}

pub fn is_image_generation_model(model_id: &str) -> bool {
    is_image_generation_model_normalized(&normalize_model_id(model_id))
}

fn is_image_generation_model_normalized(model_lower: &str) -> bool {
    model_lower.contains("dall-e")
        || model_lower.contains("dall_e")
        || model_lower.contains("gpt-image")
        || model_lower.contains("imagen")
        || model_lower.contains("banana")
        || model_lower.contains("flux.2")
        || model_lower.contains("flux-2")
        || model_lower.contains("flux/")
        || model_lower.contains("riverflow")
        || (model_lower.contains("image")
            && (model_lower.contains("gemini")
                || model_lower.starts_with("gpt-5")
                || model_lower.contains("nano")))
}

fn supports_image_input_for_image_model(model_lower: &str) -> bool {
    model_lower.contains("gemini")
        || model_lower.contains("gpt-image")
        || model_lower.contains("banana")
        || model_lower.contains("flux")
}

fn is_non_chat_model(model_lower: &str) -> bool {
    model_lower.contains("embedding")
        || model_lower.contains("whisper")
        || model_lower.contains("transcribe")
        || model_lower.contains("tts-")
        || model_lower.ends_with("-tts")
        || model_lower.contains("moderation")
        || model_lower.contains("veo-")
        || model_lower.contains("lyria")
}

fn is_image_only_vlm(model_lower: &str) -> bool {
    model_lower.contains("llava")
        || model_lower.contains("bakllava")
        || model_lower.contains("minicpm-v")
        || model_lower.contains("moondream")
        || model_lower.contains("internvl")
        || model_lower.contains("firellava")
        || model_lower.contains("pixtral")
        || (model_lower.contains("qwen") && model_lower.contains("-vl"))
        || (model_lower.contains("vision") && !model_lower.contains("gpt-4.1"))
}

fn detect_input_capabilities(model_lower: &str) -> ModelInputCapabilities {
    if is_non_chat_model(model_lower) {
        return ModelInputCapabilities::default();
    }

    ModelInputCapabilities {
        image: supports_image_input(model_lower),
        document: supports_document_input(model_lower),
        audio: supports_audio_input(model_lower),
        video: supports_video_input(model_lower),
    }
}

fn supports_image_input(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) {
        return false;
    }

    // OpenAI multimodal chat / reasoning (not plain gpt-4 text)
    if model_lower.starts_with("gpt-4o") || model_lower.starts_with("gpt-4-turbo") {
        return true;
    }
    if model_lower.starts_with("gpt-4")
        && (model_lower.contains("vision")
            || model_lower.contains("0125-preview")
            || model_lower.contains("1106-preview")
            || model_lower.contains("2024-04-09")
            || model_lower.contains("2024-08-06")
            || model_lower.contains("2024-11-20"))
    {
        return true;
    }
    if model_lower.starts_with("gpt-5")
        || model_lower.starts_with("o1")
        || model_lower.starts_with("o3")
        || model_lower.starts_with("o4-mini")
    {
        return true;
    }

    // Anthropic — all current Claude models support image input
    if model_lower.contains("claude-3")
        || model_lower.contains("claude-opus")
        || model_lower.contains("claude-sonnet")
        || model_lower.contains("claude-haiku")
        || model_lower.contains("claude-fable")
        || model_lower.contains("claude-mythos")
    {
        return true;
    }

    // Google Gemini (multimodal chat)
    if model_lower.starts_with("gemini") {
        return true;
    }

    // Open-weight / local VLMs
    if is_image_only_vlm(model_lower)
        || model_lower.contains("llama-3.2-vision")
        || model_lower.contains("llama3.2-vision")
        || model_lower.contains("llama-4-scout")
        || model_lower.contains("llama-4-maverick")
        || model_lower.contains("llama4-scout")
        || model_lower.contains("llama4-maverick")
        || model_lower.contains("qwen2.5-vl")
        || model_lower.contains("qwen2-vl")
        || model_lower.contains("qwen-vl")
        || model_lower.contains("qwen3-vl")
        || model_lower.contains("phi-3.5-vision")
        || model_lower.contains("phi3.5-vision")
        || model_lower.contains("gemma3")
    {
        return true;
    }

    false
}

fn supports_document_input(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }

    // Image-only VLMs do not accept documents
    if is_image_only_vlm(model_lower) {
        return false;
    }

    // DeepSeek API is text-only (no file upload)
    if model_lower.contains("deepseek") {
        return false;
    }

    // OpenAI chat models — documents via input_file (includes gpt-4.1 text)
    if model_lower.starts_with("gpt-3.5")
        || model_lower.starts_with("gpt-4")
        || model_lower.starts_with("gpt-5")
        || model_lower.starts_with("o1")
        || model_lower.starts_with("o3")
        || model_lower.starts_with("o4-mini")
    {
        return true;
    }

    // Anthropic Claude 3+
    if model_lower.contains("claude-3")
        || model_lower.contains("claude-opus")
        || model_lower.contains("claude-sonnet")
        || model_lower.contains("claude-haiku")
        || model_lower.contains("claude-fable")
        || model_lower.contains("claude-mythos")
    {
        return true;
    }

    // Google Gemini chat models
    if model_lower.starts_with("gemini") {
        return true;
    }

    false
}

fn supports_audio_input(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }

    if model_lower.starts_with("gemini-2.")
        || model_lower.starts_with("gemini-3")
        || model_lower.starts_with("gemini_2.")
        || model_lower.starts_with("gemini_3")
    {
        return true;
    }

    model_lower.contains("gpt-4o-audio") || model_lower.contains("gpt-4o-realtime")
}

fn supports_video_input(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }

    model_lower.starts_with("gemini-2.")
        || model_lower.starts_with("gemini-3")
        || model_lower.starts_with("gemini_2.")
        || model_lower.starts_with("gemini_3")
}

fn supports_tools(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }

    if model_lower.contains("moondream") {
        return false;
    }

    if model_lower == "groq/compound" || model_lower == "groq/compound-mini" {
        return false;
    }

    // OpenAI chat + reasoning
    if model_lower.starts_with("gpt-3.5")
        || model_lower.starts_with("gpt-4")
        || model_lower.starts_with("gpt-5")
        || model_lower.starts_with("o1")
        || model_lower.starts_with("o3")
        || model_lower.starts_with("o4-mini")
    {
        return true;
    }

    // Anthropic Claude 3+
    if model_lower.contains("claude-3")
        || model_lower.contains("claude-opus")
        || model_lower.contains("claude-sonnet")
        || model_lower.contains("claude-haiku")
        || model_lower.contains("claude-fable")
        || model_lower.contains("claude-mythos")
    {
        return true;
    }

    // Google Gemini chat
    if model_lower.starts_with("gemini") {
        return true;
    }

    // DeepSeek API (text models; VL is self-host only)
    if model_lower.contains("deepseek") && !model_lower.contains("-vl") {
        return true;
    }

    if model_lower.contains("qwen")
        || model_lower.contains("llama")
        || model_lower.contains("mistral")
        || model_lower.contains("mixtral")
        || model_lower.contains("minimax")
        || model_lower.starts_with("abab")
        || model_lower.contains("glm")
        || model_lower.contains("kimi")
        || model_lower.contains("gpt-oss")
        || model_lower.contains("gpt_oss")
        || model_lower.contains("nemotron")
        || model_lower.contains("firefunction")
    {
        return true;
    }

    false
}

fn supports_thinking(model_lower: &str) -> bool {
    if is_non_chat_model(model_lower) || is_image_generation_model_normalized(model_lower) {
        return false;
    }

    // OpenAI reasoning family
    if model_lower.starts_with("o1")
        || model_lower.starts_with("o3")
        || model_lower.starts_with("o4-mini")
        || model_lower.starts_with("gpt-5")
    {
        return true;
    }

    // DeepSeek V4 / R1
    if model_lower.contains("deepseek-v4")
        || model_lower.contains("deepseek-r1")
        || model_lower.contains("deepseek-reasoner")
    {
        return true;
    }

    // Google Gemini 2.5+ and 3.x
    if model_lower.starts_with("gemini-2.5")
        || model_lower.starts_with("gemini-3")
        || model_lower.starts_with("gemini_2.5")
        || model_lower.starts_with("gemini_3")
    {
        return true;
    }

    // Anthropic extended / adaptive thinking
    if model_lower.contains("claude-3-5-sonnet")
        || model_lower.contains("claude-3-7")
        || model_lower.contains("claude-opus-4")
        || model_lower.contains("claude-sonnet-4")
        || model_lower.contains("claude-fable")
        || model_lower.contains("claude-mythos")
    {
        return true;
    }

    if model_lower.contains("gpt-oss") || model_lower.contains("gpt_oss") {
        return true;
    }

    if model_lower.contains("qwen3.5")
        || model_lower.contains("qwen3-235b")
        || (model_lower.contains("qwen3") && model_lower.contains("thinking"))
    {
        return true;
    }

    if model_lower.contains("glm-4.7")
        || model_lower.contains("glm-5")
        || model_lower.contains("glm_4.7")
        || model_lower.contains("glm_5")
    {
        return true;
    }

    if model_lower.contains("kimi-k2") || model_lower.contains("kimi_k2") {
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openai_gpt4o_supports_image_document_and_tools() {
        let caps = detect_model_capabilities("gpt-4o");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(!caps.thinking);
        assert!(!caps.image_generation);
    }

    #[test]
    fn openai_gpt41_supports_document_not_image() {
        let caps = detect_model_capabilities("gpt-4.1");
        assert!(!caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
    }

    #[test]
    fn openai_gpt5_supports_thinking() {
        let caps = detect_model_capabilities("gpt-5.5");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(caps.thinking);
    }

    #[test]
    fn openai_dalle_is_image_generation_only() {
        let caps = detect_model_capabilities("dall-e-3");
        assert!(!caps.tools);
        assert!(!caps.thinking);
        assert!(caps.image_generation);
        assert!(!caps.input.document);
    }

    #[test]
    fn openai_gpt_image_supports_generation() {
        let caps = detect_model_capabilities("gpt-image-2");
        assert!(caps.image_generation);
        assert!(caps.input.image);
        assert!(!caps.tools);
    }

    #[test]
    fn anthropic_opus_48_supports_all_except_image_gen() {
        let caps = detect_model_capabilities("claude-opus-4-8");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(caps.thinking);
        assert!(!caps.image_generation);
    }

    #[test]
    fn anthropic_claude3_haiku_supports_image_not_thinking() {
        let caps = detect_model_capabilities("claude-3-haiku-20240307");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(!caps.thinking);
    }

    #[test]
    fn google_gemini_25_flash_thinking() {
        let caps = detect_model_capabilities("gemini-2.5-flash");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(caps.thinking);
        assert!(caps.input.audio);
        assert!(caps.input.video);
    }

    #[test]
    fn google_gemini_20_no_thinking() {
        let caps = detect_model_capabilities("gemini-2.0-flash");
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.tools);
        assert!(!caps.thinking);
        assert!(caps.input.audio);
        assert!(caps.input.video);
    }

    #[test]
    fn google_nano_banana_image_gen() {
        let caps = detect_model_capabilities("gemini-2.5-flash-image");
        assert!(caps.image_generation);
        assert!(!caps.tools);
        assert!(caps.input.image);
        assert!(!caps.input.document);
    }

    #[test]
    fn deepseek_v4_supports_tools_and_thinking_not_input() {
        let caps = detect_model_capabilities("deepseek-v4-pro");
        assert!(!caps.input.image);
        assert!(!caps.input.document);
        assert!(caps.tools);
        assert!(caps.thinking);
        assert!(caps.text_extraction);
        assert!(supports_text_extraction("deepseek-v4-pro"));
    }

    #[test]
    fn gpt_4o_has_native_document_no_text_extraction() {
        let caps = detect_model_capabilities("gpt-4o");
        assert!(caps.input.document);
        assert!(!caps.text_extraction);
    }

    #[test]
    fn llava_supports_text_extraction_not_native_document() {
        let caps = detect_model_capabilities("llava:7b");
        assert!(caps.input.image);
        assert!(!caps.input.document);
        assert!(caps.text_extraction);
    }

    #[test]
    fn ollama_llava_image_only_not_document() {
        let caps = detect_model_capabilities("llava:7b");
        assert!(caps.input.image);
        assert!(!caps.input.document);
    }

    #[test]
    fn openrouter_prefix_is_stripped() {
        let caps = detect_model_capabilities("openrouter/anthropic/claude-opus-4-8");
        assert!(caps.input.image);
        assert!(caps.thinking);
    }

    #[test]
    fn model_supports_tools_delegates_to_capabilities() {
        assert!(model_supports_tools("qwen-plus"));
        assert!(!model_supports_tools("dall-e-3"));
    }

    #[test]
    fn minimax_models_support_tools() {
        assert!(model_supports_tools("MiniMax-Text-01"));
        assert!(model_supports_tools("openrouter/minimax-m1"));
    }

    #[test]
    fn apply_input_modalities_overrides_from_metadata() {
        let mut caps = detect_model_capabilities("unknown-model");
        apply_input_modalities(
            &mut caps.input,
            &["text", "image", "file", "audio", "video"],
        );
        assert!(caps.input.image);
        assert!(caps.input.document);
        assert!(caps.input.audio);
        assert!(caps.input.video);
    }
}
