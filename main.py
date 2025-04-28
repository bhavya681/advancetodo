# #Todo App

# from fastapi import FastAPI,HTTPException
# from pydantic import BaseModel
# from typing import List,Union

# app=FastAPI()

# class TasksCreated(BaseModel):
#     name:str
#     description:str
#     is_completed:bool
#     owner:str

# task_dict:List[TasksCreated]=[]

# @app.get('/')
# def read_root():
#     return {"message":"Root Message"}

# @app.post("/add-task")
# def add_task(task:TasksCreated):
#     task_dict.append(task)
#     return {"Message":"Task Successfully Added"}

# @app.get("/tasks")
# def read_task():
#     return task_dict

# @app.get("/task/{owner}")
# def task_by_id(owner:str):
#     for task in task_dict:
#         if task.owner==owner:
#             return task
#     raise HTTPException(status_code=404,detail="Task Not Found")

# @app.put("/task-edit/{owner}")
# def update_task(owner:str,updatedTask:TasksCreated):
#     for index,task in enumerate (task_dict):
#         if task.owner==owner:
#             task_dict[index]=updatedTask
#             return {"message":"Successfully Updated"}
#     raise HTTPException(status_code=404,detail="Task Not Found")

# @app.delete("/task-del/{owner}")
# def delete_task(owner:str):
#     for index,task in enumerate (task_dict):
#         if task.owner==owner:
#             task_dict.pop(index)
#             return {"message":"Successfully Deleted"}
#     raise HTTPException(status_code=404,detail='Task Not Found')


# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List
from bson import ObjectId
import os
from dotenv import load_dotenv

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # during dev, allow all. In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_DETAILS = os.getenv("DB_URL")
# MONGO_DETAILS = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.todo_db
task_collection = database.get_collection("tasks")

# Pydantic models
class Task(BaseModel):
    name: str
    description: str
    is_completed: bool
    owner: str

# MongoDB helper
def task_serializer(task) -> dict:
    return {
        "id": str(task["_id"]),
        "name": task["name"],
        "description": task["description"],
        "is_completed": task["is_completed"],
        "owner": task["owner"]
    }

@app.get("/")
def read_root():
    return {"message": "Root Message"}

@app.post("/add-task")
async def add_task(task: Task):
    task_dict = task.dict()
    result = await task_collection.insert_one(task_dict)
    new_task = await task_collection.find_one({"_id": result.inserted_id})
    return task_serializer(new_task)

@app.get("/tasks")
async def read_task():
    tasks = []
    async for task in task_collection.find():
        tasks.append(task_serializer(task))
    return tasks

@app.get("/task/{owner}")
async def task_by_owner(owner: str):
    task = await task_collection.find_one({"owner": owner})
    if task:
        return task_serializer(task)
    raise HTTPException(status_code=404, detail="Task Not Found")

@app.put("/task-edit/{id}")
async def update_task(id: str, updated_task: Task):
    updated_data = {k: v for k, v in updated_task.dict().items() if v is not None}
    result = await task_collection.update_one(
        {"_id": ObjectId(id)}, {"$set": updated_data}
    )
    if result.modified_count == 1:
        updated = await task_collection.find_one({"_id": ObjectId(id)})
        return task_serializer(updated)
    raise HTTPException(status_code=404, detail="Task Not Found")

@app.delete("/task-del/{id}")
async def delete_task(id: str):
    result = await task_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 1:
        return {"message": "Successfully Deleted"}
    raise HTTPException(status_code=404, detail="Task Not Found")
