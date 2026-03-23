import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('69bee51a002d0334f328');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const APPWRITE_CONFIG = {
    databaseId: '69bee95000274b18bb2e',
    coursesCollectionId: '69bee95f001aade41156',
    summariesCollectionId: '69bee997003c56fb505b',
    adminsCollectionId: 'admins', // Create this collection in Appwrite
    storageBucketId: '69bee6570033b865ea80',
};

export { ID, Query };
