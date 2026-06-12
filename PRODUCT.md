# Product

## Register

product

## Users

VoxCanvas serves people who need to turn spoken ideas into quick visual sketches, especially when typing or direct canvas manipulation would slow them down. Its primary users are ordinary users creating rough diagrams or scene sketches, and users who benefit from accessible, voice-first creation workflows.

The product is also built for a demo context where evaluators need to see a stable, explainable voice-to-drawing loop, but evaluators are not the primary product audience.

## Product Purpose

VoxCanvas is a browser-based voice drawing tool. It lets users speak drawing instructions, translates simple and structured requests into drawing operations, updates a canvas, and reports what happened through clear interface feedback. For complex visual objects and style-heavy requests, the product can later route the request to AI image generation and keep the generated result as a managed image layer.

Success means users can complete a simple drawing without relying on mouse or keyboard interaction with the canvas. The MVP should prioritize reliability, understandable state, low-latency local command handling, and a clean path from speech recognition to drawing operations. Later AI image generation should extend this path for complex visual tasks without making mouse tools or manual masking part of the core flow.

After PR-08 testing, semantic robustness is part of the product bar: the system should recover from common speech-recognition mistakes, homophones, and natural phrasing such as "画一个园" or "回到最初状态". LLM assistance should improve language understanding and route the task to structured drawing, AI image generation, image editing, clarification, or unsupported feedback. Final execution must remain inspectable: structured drawing uses valid drawing operations, while generated images are managed as reversible image layers.

## Brand Personality

Clear, trustworthy, and creative.

The product should feel like a capable assistant for visual thinking: calm enough for repeated use, explicit enough for users to understand what happened, and expressive enough that voice-driven creation feels alive rather than mechanical.

## Anti-references

VoxCanvas should not feel like a generic AI landing page, a decorative portfolio site, or a novelty toy that hides state behind visual effects. It should avoid oversized marketing heroes, vague AI claims, one-note purple gradient styling, decorative glassmorphism, and interfaces that make the canvas hard to inspect.

The product should also avoid making text input look like the main path. Text simulation may exist for development and testing, but the product experience must signal voice-first creation.

## Design Principles

1. Voice first, state always visible.
2. Make the system's interpretation inspectable.
3. Keep creation fast for simple commands.
4. Treat unclear input as a recoverable conversation.
5. Preserve a stable demo path through small, verifiable increments.
6. Let AI interpret intent, but keep drawing execution explicit and reversible.
7. Use image generation for complex visual results, not as a replacement for structured editable drawing.

## Accessibility & Inclusion

Use WCAG 2.2 AA as the design target and checking baseline, without claiming formal certification during MVP development. At minimum, PR-01 and later UI work should preserve readable contrast, semantic controls, visible focus states, and keyboard-accessible basic controls.

Formal demo creation remains voice-first, but the interface should still expose enough visible status and structured logs for users to understand speech recognition, command parsing, and drawing results.
