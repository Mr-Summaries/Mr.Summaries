import { Client, Databases, Storage, Account, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('mr-summaries'); // וודא שזהו אכן ה-Project ID שלך מהקונסול

const databases = new Databases(client);
const storage = new Storage(client);
const account = new Account(client);

const DATABASE_ID = 'mr-summaries-db';
const COLLECTIONS = {
    courses: 'courses',
    summaries: 'summaries',
    lectures: 'lectures',
    examples: 'examples',
    enrollments: 'enrollments',
};
const BUCKET_ID = 'summaries-bk';

export const api = {
  // Generic CRUD methods
  async getDocuments(collection: string, queries: any[] = []) {
    return await databases.listDocuments(DATABASE_ID, collection, queries);
  },
  async getDocument(collection: string, id: string) {
    return await databases.getDocument(DATABASE_ID, collection, id);
  },
  async createDocument(collection: string, id: string, data: any) {
    return await databases.createDocument(DATABASE_ID, collection, id || ID.unique(), data);
  },
  async updateDocument(collection: string, id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, collection, id, data);
  },
  async deleteDocument(collection: string, id: string) {
    return await databases.deleteDocument(DATABASE_ID, collection, id);
  },

  async getCourses() {
    return await this.getDocuments(COLLECTIONS.courses);
  },

  async getCourse(id: string) {
    return await this.getDocument(COLLECTIONS.courses, id);
  },

  async getSummaries(courseId?: string) {
    const queries = [];
    if (courseId) queries.push(Query.equal('courses', courseId));
    return await this.getDocuments(COLLECTIONS.summaries, queries);
  },

  async getSummary(id: string) {
    return await this.getDocument(COLLECTIONS.summaries, id);
  },

  async getFileView(fileId: string) {
    return storage.getFileView(BUCKET_ID, fileId).toString();
  },

  async getFileDownload(fileId: string) {
    return storage.getFileDownload(BUCKET_ID, fileId).toString();
  },

  async getEnrollment(userId: string, courseId: string) {
    const queries = [
        Query.equal('userID', userId),
        Query.equal('courseID', courseId)
    ];
    const data = await this.getDocuments(COLLECTIONS.enrollments, queries);
    return data.documents[0] || null;
  },

  async getEnrollments(userId: string) {
    const queries = [Query.equal('userID', userId)];
    return await this.getDocuments(COLLECTIONS.enrollments, queries);
  },

  async createEnrollment(userId: string, courseId: string) {
    return await this.createDocument(COLLECTIONS.enrollments, ID.unique(), { userID: userId, courseID: courseId });
  },

  async deleteEnrollment(id: string) {
    return await this.deleteDocument(COLLECTIONS.enrollments, id);
  },

  async getLectures(courseId: string) {
    const queries = [Query.equal('courses', courseId)];
    return await this.getDocuments(COLLECTIONS.lectures, queries);
  },

  async getExamples(courseId: string) {
    const queries = [Query.equal('courses', courseId)];
    return await this.getDocuments(COLLECTIONS.examples, queries);
  },

  async getLecture(id: string) {
    return await this.getDocument(COLLECTIONS.lectures, id);
  },

  async getExample(id: string) {
    return await this.getDocument(COLLECTIONS.examples, id);
  },

  async getFile(fileId: string) {
    return await storage.getFile(BUCKET_ID, fileId);
  },

  async createSummary(id: string, data: any) {
    return await this.createDocument(COLLECTIONS.summaries, id, data);
  },

  async updateSummary(id: string, data: any) {
    return await this.updateDocument(COLLECTIONS.summaries, id, data);
  },

  async deleteSummary(id: string) {
    return await this.deleteDocument(COLLECTIONS.summaries, id);
  },

  async createFile(file: File, fileId?: string) {
    return await storage.createFile(BUCKET_ID, fileId || ID.unique(), file);
  },

  async deleteFile(fileId: string) {
    return await storage.deleteFile(BUCKET_ID, fileId);
  },

  async createCourse(id: string, data: any) {
    return await this.createDocument(COLLECTIONS.courses, id, data);
  },

  async updateCourse(id: string, data: any) {
    return await this.updateDocument(COLLECTIONS.courses, id, data);
  },

  async deleteCourse(id: string) {
    return await this.deleteDocument(COLLECTIONS.courses, id);
  },

  async createLecture(id: string, data: any) {
    return await this.createDocument(COLLECTIONS.lectures, id, data);
  },

  async updateLecture(id: string, data: any) {
    return await this.updateDocument(COLLECTIONS.lectures, id, data);
  },

  async deleteLecture(id: string) {
    return await this.deleteDocument(COLLECTIONS.lectures, id);
  },

  async createExample(id: string, data: any) {
    return await this.createDocument(COLLECTIONS.examples, id, data);
  },

  async updateExample(id: string, data: any) {
    return await this.updateDocument(COLLECTIONS.examples, id, data);
  },

  async deleteExample(id: string) {
    return await this.deleteDocument(COLLECTIONS.examples, id);
  },

  async login(email: string, pass: string) {
    await account.createEmailPasswordSession(email, pass);
    return await account.get();
  },

  async signup(email: string, pass: string, name?: string) {
    await account.create(ID.unique(), email, pass, name);
    return await this.login(email, pass);
  },

  async logout() {
    return await account.deleteSession('current');
  },

  async me() {
    try {
      return await account.get();
    } catch (e) {
      return null;
    }
  },

  async updateName(name: string) {
    return await account.updateName(name);
  },

  async updateEmail(email: string, password: string) {
    // Note: Appwrite requires a slightly different flow for email updates on client
    // For now, let's just use the basic update
    return await account.updateEmail(email, password);
  }
};
