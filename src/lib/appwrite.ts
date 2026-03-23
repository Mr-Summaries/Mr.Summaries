import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('mr-summaries');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const APPWRITE_CONFIG = {
    databaseId: 'mr-summaries-db',
    coursesCollectionId: 'courses',
    summariesCollectionId: 'summaries',
    enrollmentsCollectionId: 'enrollments',
    adminsCollectionId: 'admins',
    storageBucketId: 'summaries-bk',
};

export { ID, Query };
