import os
import json
from google.cloud import aiplatform
import vertexai
import vertexai.preview
from vertexai.generative_models import GenerativeModel
from google.auth import default
from functions_framework import http

print(aiplatform.__dict__)
@http
def vertex_chat_function(request):
    """Responds to any HTTP request with a single prompt.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text.
    """

    headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    
    # Set CORS headers for the preflight request
    if request.method == "OPTIONS":
        # Allows GET requests from any origin with the Content-Type
        # header and caches preflight response for an 3600s
        return ("", 204, headers)

    # 1. Get the Project ID and secret
    PROJECT_ID = os.environ.get("GCP_PROJECT") 
    if not PROJECT_ID:
         return "Error: GCP_PROJECT environment variable not set.", 500, headers
    
    SECRET = os.environ.get("GTM_SECRET") 
    if not SECRET:
         return "Error: SECRET` not set.", 500, headers
    if len(SECRET) < 6:
        return "Secret is not long enough", 500, headers
    
    # 2. Configure Vertex AI 
    LOCATION = "europe-west2"  # Choose the desired location
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # 3. Define the Model (Use the latest Gemini Model)
    MODEL_NAME = "gemini-1.5-flash"

    # 4. Get the prompt from the request
    try:
        request_json = request.get_json()

        if not request_json:
            return "Error: Query must be JSON", 400, headers

        if  "prompt" in request_json:
            prompt = request_json["prompt"]
        else:
            return "Error: Please provide a prompt in the request body as a JSON key 'prompt'.", 400, headers
        
        if "secret" in request_json:
            if SECRET != request_json["secret"]:
                return "Error: Secret is not valid.", 400, headers
        else:
            return "Error: Secret not provided",400,headers
    except Exception as e:
        return f"Error parsing request: {str(e)}", 400,headers

    # 5. Set the parameters for the prediction
    parameters = {
        "temperature": 0.3,
        "max_output_tokens": 2048,
        "top_p": 0.9,
        "top_k": 1
    }
    
    # 6. Create the generative model instance
    model = GenerativeModel(MODEL_NAME)

    # 7. Get the response
    try:
        response = model.generate_content(prompt, generation_config=parameters)
        return response.text, 200, headers
    except Exception as e:
        return f"Error during generation: {str(e)}", 500, headers
    
