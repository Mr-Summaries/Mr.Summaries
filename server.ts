import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { Client, Databases, Storage, Users, Query, ID } from "node-appwrite";
import * as Appwrite from "node-appwrite";
const InputFile = (Appwrite as any).InputFile;
import cookieParser from "cookie-parser";
import session from "express-session";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mr-summaries-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Appwrite Server Client
  const appwriteClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'mr-summaries')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const appwriteDatabases = new Databases(appwriteClient);
  const appwriteStorage = new Storage(appwriteClient);
  const appwriteUsers = new Users(appwriteClient);

  const APPWRITE_CONFIG = {
    databaseId: 'mr-summaries-db',
    coursesCollectionId: 'courses',
    summariesCollectionId: 'summaries',
    lecturesCollectionId: 'lectures',
    examplesCollectionId: 'examples',
    enrollmentsCollectionId: 'enrollments',
    adminsCollectionId: 'admins',
    storageBucketId: 'summaries-bk',
  };

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Appwrite Data Proxy Endpoints
  app.get("/api/courses", async (req, res) => {
    try {
      const result = await appwriteDatabases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        req.params.id
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/courses", async (req, res) => {
    try {
      const { id, data } = req.body;
      const result = await appwriteDatabases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        id || ID.unique(),
        data
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/courses/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/courses/:id", async (req, res) => {
    try {
      await appwriteDatabases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.coursesCollectionId,
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/summaries", async (req, res) => {
    const { courseId } = req.query;
    const queries = [];
    if (courseId) {
      queries.push(Query.equal('courses', courseId as string));
    }
    try {
      const result = await appwriteDatabases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        queries
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/summaries", async (req, res) => {
    try {
      const { id, data } = req.body;
      const result = await appwriteDatabases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        id || ID.unique(),
        data
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/summaries/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/summaries/:id", async (req, res) => {
    try {
      await appwriteDatabases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lectures", async (req, res) => {
    const { courseId } = req.query;
    const queries = [];
    if (courseId) {
      queries.push(Query.equal('courses', courseId as string));
    }
    try {
      const result = await appwriteDatabases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.lecturesCollectionId,
        queries
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/lectures/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.lecturesCollectionId,
        req.params.id
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/lectures", async (req, res) => {
    try {
      const { id, data } = req.body;
      const result = await appwriteDatabases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.lecturesCollectionId,
        id || ID.unique(),
        data
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/lectures/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.lecturesCollectionId,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/lectures/:id", async (req, res) => {
    try {
      await appwriteDatabases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.lecturesCollectionId,
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/examples", async (req, res) => {
    const { courseId } = req.query;
    const queries = [];
    if (courseId) {
      queries.push(Query.equal('courses', courseId as string));
    }
    try {
      const result = await appwriteDatabases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.examplesCollectionId,
        queries
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/examples/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.examplesCollectionId,
        req.params.id
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/examples", async (req, res) => {
    try {
      const { id, data } = req.body;
      const result = await appwriteDatabases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.examplesCollectionId,
        id || ID.unique(),
        data
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/examples/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.examplesCollectionId,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/examples/:id", async (req, res) => {
    try {
      await appwriteDatabases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.examplesCollectionId,
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/enrollments", async (req, res) => {
    const { userId, courseId } = req.query;
    const queries = [];
    if (userId) queries.push(Query.equal('userID', userId as string));
    if (courseId) queries.push(Query.equal('courseID', courseId as string));
    try {
      const result = await appwriteDatabases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.enrollmentsCollectionId,
        queries
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/enrollments", async (req, res) => {
    const { userId, courseId } = req.body;
    try {
      const result = await appwriteDatabases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.enrollmentsCollectionId,
        ID.unique(),
        { userID: userId, courseID: courseId }
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/enrollments/:id", async (req, res) => {
    try {
      await appwriteDatabases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.enrollmentsCollectionId,
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/summaries/:id", async (req, res) => {
    try {
      const result = await appwriteDatabases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.summariesCollectionId,
        req.params.id
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/storage/files/:fileId", async (req, res) => {
    try {
      const file = await appwriteStorage.getFile(APPWRITE_CONFIG.storageBucketId, req.params.fileId);
      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/storage/files/:fileId/view", async (req, res) => {
    try {
      const result = await appwriteStorage.getFileView(APPWRITE_CONFIG.storageBucketId, req.params.fileId);
      res.set('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/storage/files/:fileId/download", async (req, res) => {
    try {
      const result = await appwriteStorage.getFileDownload(APPWRITE_CONFIG.storageBucketId, req.params.fileId);
      res.set('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/storage/files", upload.single('file'), async (req: any, res) => {
    try {
      const { fileId } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const inputFile = InputFile.fromBuffer(req.file.buffer, req.file.originalname);
      const result = await appwriteStorage.createFile(
        APPWRITE_CONFIG.storageBucketId,
        fileId || ID.unique(),
        inputFile
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/storage/files/:fileId", async (req, res) => {
    try {
      await appwriteStorage.deleteFile(APPWRITE_CONFIG.storageBucketId, req.params.fileId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini AI Proxy Endpoint
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, model = "gemini-3-flash-preview" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model,
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Auth Proxy Endpoints
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      // Use Appwrite REST API to verify password
      const response = await fetch(`${process.env.APPWRITE_ENDPOINT}/account/sessions/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID!,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // If successful, find the user to store in session
      const users = await appwriteUsers.list([Query.equal('email', email)]);
      if (users.total === 0) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const user = users.users[0];
      (req.session as any).user = user;
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const user = await appwriteUsers.create(ID.unique(), email, undefined, password, name);
      (req.session as any).user = user;
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if ((req.session as any).user) {
      res.json((req.session as any).user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  app.patch("/api/auth/name", async (req, res) => {
    const { name } = req.body;
    const user = (req.session as any).user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
      const result = await appwriteUsers.updateName(user.$id, name);
      (req.session as any).user = result;
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/auth/email", async (req, res) => {
    const { email, password } = req.body;
    const user = (req.session as any).user;
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    try {
      // Appwrite requires password verification for email update
      const response = await fetch(`${process.env.APPWRITE_ENDPOINT}/account/sessions/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID!,
        },
        body: JSON.stringify({ email: user.email, password }),
      });

      if (!response.ok) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const result = await appwriteUsers.updateEmail(user.$id, email);
      (req.session as any).user = result;
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
