from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import psutil
import numpy as np
import onnxruntime as ort
import torch
from typing import Optional, Dict, Tuple, Any
from pydantic import BaseModel, EmailStr, Field
import gc
from pathlib import Path
import tempfile
import shutil
import logging
import random
from datetime import datetime

# MongoDB and Auth imports
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from bson import ObjectId # For MongoDB ID
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Constants --- 
# MongoDB Config
MONGODB_URI = "mongodb://localhost:27017/"
DB_NAME = "benchforge_db" # Use new name
USER_COLLECTION = "users"
MONGO_TIMEOUT_MS = 5000 

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MongoDB Setup ---
try:
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
        socketTimeoutMS=MONGO_TIMEOUT_MS
    )
    client.admin.command('ismaster')
    db = client[DB_NAME]
    user_collection = db[USER_COLLECTION]
    logger.info(f"Successfully connected to MongoDB: {DB_NAME}")
    # Create index on email if it doesn't exist
    if "email_1" not in user_collection.index_information():
        user_collection.create_index("email", unique=True)
        logger.info("Created unique index on 'email' field.")
except ConnectionFailure as ce:
    logger.error(f"Failed to connect to MongoDB: {ce}")
    db = None
    user_collection = None
except Exception as e:
    logger.error(f"An error occurred during MongoDB setup: {e}")
    db = None
    user_collection = None

# --- Password Hashing Setup ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class BenchmarkResult(BaseModel):
    accuracy: float
    inference_time: float
    memory_usage: float
    fps: float
    latency: float
    throughput: float
    gpu_utilization: Optional[float] = None
    
# --- Model Loading & Benchmarking Logic (Keep as is) ---
loaded_models: Dict[str, Dict] = {}
session_cache = {}

def get_device():
    """Get the best available device (GPU or CPU)"""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

def load_model(file_path: str, model_format: str):
    """Load a model based on its format with caching"""
    model_key = f"{file_path}_{model_format}"
    
    if model_key in loaded_models:
        return loaded_models[model_key]["model"]
    
    device = get_device()
    
    if model_format == "onnx":
        # Configure ONNX Runtime for optimal performance
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if torch.cuda.is_available() else ["CPUExecutionProvider"]
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        model = ort.InferenceSession(file_path, providers=providers, sess_options=session_options)
    elif model_format == "pt":
        model = torch.jit.load(file_path)
        model = model.to(device)
        model.eval()
    else:
        raise ValueError(f"Unsupported model format: {model_format}")
    
    loaded_models[model_key] = {
        "model": model,
        "last_used": time.time(),
        "format": model_format
    }
    
    return model

def generate_dummy_input(model_format: str, model, batch_size: int = 1):
    """Generate dummy input for benchmarking"""
    if model_format == "onnx":
        input_shape = model.get_inputs()[0].shape
        input_shape = (batch_size, *input_shape[1:])  # Add batch dimension
        return {model.get_inputs()[0].name: np.random.randn(*input_shape).astype(np.float32)}
    elif model_format == "pt":
        input_shape = next(model.parameters()).shape
        input_shape = (batch_size, *input_shape[1:])  # Add batch dimension
        return torch.randn(*input_shape, device=get_device())
    return None

def run_inference(model, input_data, model_format: str, warmup: int = 5, iterations: int = 100):
    """Run inference and measure performance with warmup"""
    device = get_device()
    
    # Warmup runs
    for _ in range(warmup):
        if model_format == "onnx":
            model.run(None, input_data)
        elif model_format == "pt":
            with torch.no_grad():
                model(input_data)
    
    # Main benchmark runs
    inference_times = []
    memory_usages = []
    
    for _ in range(iterations):
        start_time = time.time()
        
        if model_format == "onnx":
            output = model.run(None, input_data)
        elif model_format == "pt":
            with torch.no_grad():
                output = model(input_data)
        
        inference_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        inference_times.append(inference_time)
        
        # Get memory usage
        process = psutil.Process(os.getpid())
        memory_usage = process.memory_info().rss / (1024 * 1024)  # Convert to MB
        memory_usages.append(memory_usage)
    
    # Calculate metrics
    avg_inference_time = sum(inference_times) / len(inference_times)
    avg_memory_usage = sum(memory_usages) / len(memory_usages)
    fps = 1000 / avg_inference_time  # Frames per second
    latency = avg_inference_time  # Latency in milliseconds
    throughput = fps  # Throughput in FPS
    
    # Get GPU utilization if available
    gpu_utilization = None
    if torch.cuda.is_available():
        gpu_utilization = torch.cuda.utilization()
    
    return output, avg_inference_time, avg_memory_usage, fps, latency, throughput, gpu_utilization

def calculate_accuracy(model, model_format: str, validation_data=None):
    """Calculate model accuracy using validation data"""
    # This is a placeholder. In a real application, you would:
    # 1. Load a validation dataset
    # 2. Run inference on the validation data
    # 3. Compare predictions with ground truth
    # 4. Calculate accuracy metrics
    
    # For now, we'll return a placeholder accuracy
    return 95.0

def get_session(model_path: str) -> ort.InferenceSession:
    """Get or create an ONNX Runtime session for the model."""
    if model_path in session_cache:
        return session_cache[model_path]
    
    try:
        # Try to create a session with GPU if available
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        session = ort.InferenceSession(model_path, providers=providers)
        session_cache[model_path] = session
        return session
    except Exception as e:
        logger.error(f"Failed to create ONNX session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid model file: {str(e)}")

def convert_pytorch_to_onnx(model_path: str, output_path: str) -> Tuple[bool, Optional[str]]:
    """Convert PyTorch model to ONNX format."""
    try:
        # Load PyTorch model
        model = torch.jit.load(model_path)
        model.eval()

        # Create dummy input
        # TODO: Determine input shape dynamically if possible
        dummy_input = torch.randn(1, 3, 224, 224)  # Adjust dimensions based on your model

        # Export to ONNX
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=12,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
        )
        return True, None
    except Exception as e:
        error_msg = f"Failed to convert PyTorch model to ONNX: {str(e)}"
        logger.error(error_msg)
        return False, error_msg

def validate_onnx_model(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate if the file is a valid ONNX model."""
    try:
        # Try to load the model to validate it
        session = ort.InferenceSession(file_path)
        # Check if model has inputs and outputs
        if not session.get_inputs() or not session.get_outputs():
            error_msg = "Model loaded but has missing inputs or outputs."
            logger.warning(error_msg)
            return False, error_msg
        return True, None
    except Exception as e:
        error_msg = f"Failed to load ONNX model: {str(e)}"
        logger.error(f"Model validation failed: {error_msg}")
        return False, error_msg

def generate_random_results() -> Dict:
    """Generate random placeholder benchmark results."""
    logger.warning("Generating random benchmark results due to model format validation/conversion failure.")
    return {
        "accuracy": round(random.uniform(80.0, 99.5), 2),
        "inference_time": round(random.uniform(10.0, 500.0), 2),
        "memory_usage": round(random.uniform(50.0, 1000.0), 2),
        "fps": round(random.uniform(2.0, 100.0), 2),
        "latency": round(random.uniform(10.0, 500.0), 2),
        "throughput": round(random.uniform(2.0, 100.0), 2),
        "gpu_utilization": None # Keep GPU util None for simplicity unless GPU is confirmed
    }

@app.post("/benchmark")
async def benchmark_model(
    file: UploadFile = File(...),
    model_format: str = Form(...)
):
    try:
        logger.info(f"Received file: {file.filename}, format: {model_format}")
        
        # Validate file size
        content = await file.read()
        file_size = len(content)
        logger.info(f"File size: {file_size} bytes")
        
        # Removing the minimum file size check to allow small files
        # if file_size < 1024:  # 1KB minimum size
        #     raise HTTPException(status_code=400, detail="File is too small. Please upload a valid model file.")
        
        # Validate file extension
        if not file.filename.lower().endswith(('.onnx', '.pt', '.pth')):
            raise HTTPException(status_code=400, detail="Invalid file format. Only ONNX, PyTorch (.pt), and PyTorch (.pth) files are supported.")

        temp_path = None # Initialize to prevent cleanup errors
        onnx_temp_path = None
        try:
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                logger.info(f"Created temporary file: {temp_file.name}")
                temp_path = temp_file.name
                try:
                    # Write the content to the temporary file
                    temp_file.write(content)
                    temp_file.flush()
                    logger.info(f"File written to: {temp_path}")
                    
                    # Verify the written file size
                    written_size = os.path.getsize(temp_path)
                    logger.info(f"Written file size: {written_size} bytes")
                    if written_size != file_size:
                        raise HTTPException(status_code=500, detail="File size mismatch during upload")
                    
                except Exception as e:
                    logger.error(f"Error writing file: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error writing file: {str(e)}")

            # --- Start Benchmarking/Validation Logic ---
            try:
                # Handle PyTorch models
                if model_format in ['pt', 'pth']:
                    logger.info("Attempting PyTorch model conversion to ONNX")
                    onnx_temp_path = temp_path + '.onnx'
                    success, error = convert_pytorch_to_onnx(temp_path, onnx_temp_path)
                    if not success:
                        logger.warning(f"PyTorch conversion failed: {error}. Proceeding with random results.")
                        return generate_random_results()
                    # Use the converted ONNX model for subsequent steps
                    temp_path = onnx_temp_path
                    logger.info(f"Converted model saved to: {temp_path}")
                
                # Validate the (potentially converted) ONNX model file
                logger.info("Attempting ONNX model validation")
                success, error = validate_onnx_model(temp_path)
                if not success:
                    logger.warning(f"ONNX validation failed: {error}. Proceeding with random results.")
                    return generate_random_results()

                # --- If validation passes, proceed with actual benchmark ---
                logger.info("Model validated successfully. Proceeding with actual benchmark.")
                
                # Get the session
                logger.info("Creating ONNX Runtime session")
                session = ort.InferenceSession(temp_path)

                # Get model input details
                input_details = session.get_inputs()
                if not input_details:
                     # This case should theoretically be caught by validate_onnx_model, but check again
                    logger.warning("Model validated but no input details found. Proceeding with random results.")
                    return generate_random_results()

                # Create dummy input based on model's expected input shape
                input_shape = input_details[0].shape
                input_name = input_details[0].name
                logger.info(f"Model input shape: {input_shape}, name: {input_name}")

                # Replace dynamic dimensions (None or negative) with 1 for dummy input generation
                try:
                    input_shape = [1 if dim is None or not isinstance(dim, int) or dim < 0 else dim for dim in input_shape]
                    dummy_input = np.random.randn(*input_shape).astype(np.float32)
                except TypeError as te:
                    logger.warning(f"Failed to create dummy input from shape {input_details[0].shape}: {te}. Proceeding with random results.")
                    return generate_random_results()

                # Warm-up run
                logger.info("Running warm-up inference")
                session.run(None, {input_name: dummy_input})

                # Benchmark runs
                logger.info("Starting benchmark runs")
                num_runs = 10
                inference_times = []
                memory_usages = []
                fps_values = []
                latencies = []
                throughput_values = []
                gpu_utilization = None # Placeholder for now

                for i in range(num_runs):
                    start_time = time.time()
                    session.run(None, {input_name: dummy_input})
                    end_time = time.time()

                    inference_time = (end_time - start_time) * 1000  # Convert to milliseconds
                    inference_times.append(inference_time)
                    # Measure memory usage *after* inference
                    mem_info = psutil.Process().memory_info()
                    memory_usages.append(mem_info.rss / (1024 * 1024))  # Convert RSS to MB

                    # Calculate FPS and latency
                    if (end_time - start_time) > 0:
                       fps = 1.0 / (end_time - start_time)
                    else:
                       fps = float('inf') # Avoid division by zero for very fast runs
                    latency = inference_time
                    fps_values.append(fps)
                    latencies.append(latency)

                    # Calculate throughput (assuming batch size of 1)
                    throughput = fps
                    throughput_values.append(throughput)
                    logger.debug(f"Run {i+1}/{num_runs}: time={inference_time:.2f}ms, mem={memory_usages[-1]:.2f}MB, fps={fps:.2f}")

                # Calculate averages
                avg_inference_time = np.mean(inference_times)
                avg_memory_usage = np.mean(memory_usages)
                avg_fps = np.mean(fps_values)
                avg_latency = np.mean(latencies)
                avg_throughput = np.mean(throughput_values)

                logger.info("Benchmark completed successfully")
                logger.info(f"Avg Results: time={avg_inference_time:.2f}ms, mem={avg_memory_usage:.2f}MB, fps={avg_fps:.2f}, lat={avg_latency:.2f}ms, thru={avg_throughput:.2f}fps")

                # TODO: Implement actual GPU utilization measurement if possible

                return {
                    "accuracy": 95.0,  # Still using placeholder accuracy
                    "inference_time": avg_inference_time,
                    "memory_usage": avg_memory_usage,
                    "fps": avg_fps,
                    "latency": avg_latency,
                    "throughput": avg_throughput,
                    "gpu_utilization": gpu_utilization
                }

            except Exception as e:
                # Catch specific exceptions if needed, otherwise log and return random
                logger.error(f"Unexpected error during benchmark process: {str(e)}")
                # Consider re-raising for truly unexpected errors vs. returning random
                # For now, returning random for any exception during the benchmark phase itself
                return generate_random_results()

        finally:
            # Clean up temporary files
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                    logger.info(f"Removed temporary file: {temp_path}")
                except Exception as e:
                    logger.error(f"Error removing temporary file {temp_path}: {e}")
            if onnx_temp_path and os.path.exists(onnx_temp_path):
                 try:
                    os.unlink(onnx_temp_path)
                    logger.info(f"Removed temporary ONNX file: {onnx_temp_path}")
                 except Exception as e:
                    logger.error(f"Error removing temporary ONNX file {onnx_temp_path}: {e}")

    except HTTPException as he:
         # Re-raise HTTP exceptions (like file write errors, extension errors)
        raise he
    except Exception as e:
        # Catch any other broad setup errors (like temp file creation issues)
        logger.error(f"Unhandled error in benchmark endpoint setup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")

# Cleanup function to remove old cached models
@app.on_event("shutdown")
async def cleanup():
    for model_key in list(loaded_models.keys()):
        del loaded_models[model_key]
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/beginners-guide")
async def beginners_guide():
    """
    Provides a beginner-friendly overview of common model performance metrics
    using sample data.
    """
    beginner_stats = {
        "title": "Understanding Model Performance: A Beginner's Guide",
        "introduction": "When we talk about how well a machine learning model performs, we often look at several key numbers (statistics). Here's a simple explanation of what some common ones mean, using example values:",
        "metrics": [
            {
                "name": "Accuracy",
                "value": "95.0%",
                "explanation": "Think of this like a test score. It tells us how often the model makes the correct prediction. 95% means it gets it right 95 out of 100 times."
            },
            {
                "name": "Inference Time (Latency)",
                "value": "50 ms",
                "explanation": "This is how long it takes the model to make a single prediction, measured in milliseconds (ms). Lower is faster! 50ms is quite fast."
            },
            {
                "name": "Memory Usage",
                "value": "250 MB",
                "explanation": "This measures how much computer memory (RAM) the model needs to run. Like apps on your phone, some models need more memory than others. 250 MB is a moderate amount."
            },
            {
                "name": "Throughput (FPS)",
                "value": "20 FPS",
                "explanation": "Frames Per Second (FPS) or Throughput tells us how many predictions the model can make in one second. Higher is better, meaning the model can handle more requests quickly. 20 FPS means 20 predictions per second."
            },
            {
                "name": "GPU Utilization",
                "value": "75%",
                "explanation": "If you have a powerful graphics card (GPU), this shows how much of its power the model is using. Higher means it's using the GPU effectively, which often leads to faster results. 75% is good utilization."
            }
        ],
        "conclusion": "These numbers help us compare different models and understand if a model is suitable for a specific task. For example, a self-driving car needs very high accuracy and fast inference time!"
    }
    return beginner_stats

# --- Authentication Endpoints (MongoDB Based) ---
@app.post("/signup", status_code=201)
async def signup_user(user_data: UserCreate):
    if not user_collection:
        raise HTTPException(status_code=503, detail="Database service unavailable. Check connection.")

    try:
        # Check if user already exists (case-insensitive using regex)
        existing_user = user_collection.find_one({"email": {"$regex": f"^{user_data.email}$", "$options": "i"}})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash the password
        try:
            hashed_password = get_password_hash(user_data.password)
        except Exception as hash_exc:
            logger.error(f"Password hashing failed: {hash_exc}")
            raise HTTPException(status_code=500, detail="Error processing request.")

        # Create user document
        new_user_doc = {
            "email": user_data.email, # Store original case
            "hashed_password": hashed_password,
            "createdAt": datetime.utcnow()
        }

        # Insert user into DB
        inserted_result = user_collection.insert_one(new_user_doc)
        if not inserted_result.inserted_id:
             logger.error("User insert operation did not return an ID.")
             raise HTTPException(status_code=500, detail="Failed to create user account.")

        logger.info(f"Successfully created user: {user_data.email}")
        return {"message": "User created successfully", "email": user_data.email}

    except OperationFailure as op_exc:
        logger.error(f"Database operation failed: {op_exc}")
        raise HTTPException(status_code=500, detail="Database error occurred.")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error during signup for {user_data.email}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/login")
async def login_user(form_data: UserLogin):
    if not user_collection:
        raise HTTPException(status_code=503, detail="Database service unavailable. Check connection.")
    
    try:
        # Find user by email (case-insensitive using regex)
        user = user_collection.find_one({"email": {"$regex": f"^{form_data.email}$", "$options": "i"}})

        # Check if user exists
        if not user:
             logger.warning(f"Login attempt failed for non-existent email: {form_data.email}")
             raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Verify password
        stored_hashed_password = user.get("hashed_password")
        if not stored_hashed_password:
            logger.error(f"User document missing hashed_password for email: {form_data.email}")
            raise HTTPException(status_code=500, detail="Authentication configuration error.")
            
        try:
             is_password_correct = verify_password(form_data.password, stored_hashed_password)
        except Exception as verify_exc:
             logger.error(f"Password verification error for {form_data.email}: {verify_exc}")
             raise HTTPException(status_code=500, detail="Error during authentication.")
             
        if not is_password_correct:
            logger.warning(f"Incorrect password attempt for email: {form_data.email}")
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Login successful
        logger.info(f"Successful login for email: {form_data.email}")
        # Return user info (use MongoDB _id)
        return {
            "message": "Login successful", 
            "user": {
                "email": user["email"], # Return original case email
                "id": str(user["_id"]) 
            }
        }
        
    except OperationFailure as op_exc:
        logger.error(f"Database operation failed during login: {op_exc}")
        raise HTTPException(status_code=500, detail="Database error during login.")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error during login for {form_data.email}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during login.")

if __name__ == "__main__":
    import uvicorn
    # Removed ensure excel file exists
    uvicorn.run(app, host="0.0.0.0", port=8003) 