# Code Flow Analysis: Product+Persona Generation

## Current Execution Flow

### 1. Entry Point
- **File**: `src/lib/product-image/generators/product-persona-generator.ts`
- **Function**: `generateProductPersonaImage()` (line 29)
- **Called from**: `src/lib/product-image/pipeline.ts` (line 386)

### 2. Reference Image Preparation
- **Product Reference** (lines 46-63):
  - ✅ Fetches product image URL
  - ✅ Converts to base64: `productBase64`
  
- **Persona Reference** (lines 106-118):
  - ✅ Fetches persona.imageUrl if available
  - ✅ Converts to base64: `personaReferenceBase64`

- **Reference Array** (lines 124-127):
  ```typescript
  const refImages = [productBase64]; // Priority 1: Product
  if (personaReferenceBase64) {
    refImages.push(personaReferenceBase64); // Priority 2: Persona
  }
  ```
  ✅ Array is created correctly with both images

### 3. API Call
- **Line 171**: `imagen.generateImage(fullPrompt, { referenceImages: refImages, ... })`
- ✅ Reference images ARE passed to the provider

### 4. Provider Implementation
- **File**: `src/lib/providers/google-imagen/VertexImagenProvider.ts`
- **Function**: `generateImage()` (line 127)
- **Default Model**: `models/imagen-4.0-fast-generate-001` (line 12)

#### Critical Decision Point (line 139):
```typescript
const isGenerateContentModel = requestedModel.includes('gemini') || requestedModel.includes('banana');
```

- **Model**: `imagen-4.0-fast-generate-001`
- **Check**: Does it include 'gemini'? NO
- **Check**: Does it include 'banana'? NO
- **Result**: `isGenerateContentModel = false`

#### Branch Execution:

**❌ NOT TAKEN - generateContent branch (lines 144-178)**:
```typescript
if (isGenerateContentModel) {
  // Reference images ARE added here (lines 160-169)
  if (options?.referenceImages && options.referenceImages.length > 0) {
    options.referenceImages.forEach(imgBase64 => {
      parts.push({ inline_data: { mime_type: 'image/png', data: imgBase64 } });
    });
  }
  payload = { contents: [{ parts: parts }], ... };
}
```

**✅ TAKEN - predict branch (lines 179-188)**:
```typescript
else {
  url = `${this.baseUrl}/${requestedModel}:predict?key=${this.apiKey}`;
  payload = {
    instances: [{ prompt: finalPrompt }],  // ❌ NO REFERENCE IMAGES!
    parameters: {
      sampleCount: 1,
      aspectRatio: options?.aspectRatio || '1:1',
    },
  };
}
```

## The Problem

**Reference images are NEVER added to the payload when using the `:predict` endpoint.**

The code structure:
- ✅ Reference images are fetched and prepared correctly
- ✅ Reference images are passed to `generateImage()` 
- ❌ Reference images are only added to payload in the `generateContent` branch
- ❌ The `predict` branch doesn't include reference images in the payload structure

## Evidence from Other Code

Looking at `src/app/api/ai/video/image-to-video/route.ts` (lines 48-54):
```typescript
instances: [{
  prompt: prompt,
  image: {  // ✅ Images CAN be included in instances format!
    bytesBase64Encoded: base64Image,
    mimeType: mimeType
  }
}]
```

This shows that the `:predict` endpoint DOES support images in the instances format, but the current implementation doesn't add them.

## Solutions

### Option 1: Add Reference Images to :predict Payload
Modify the `:predict` branch to include reference images in the instances format.

### Option 2: Use generateContent Endpoint
Switch to using the `:generateContent` endpoint which already has reference image support implemented.

### Option 3: Use Different Model
Use a model that matches 'gemini' or 'banana' to trigger the generateContent branch.
