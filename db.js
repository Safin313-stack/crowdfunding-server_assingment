import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER || 'cluster0.mongodb.net'}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let collections;

export async function connectDB() {
  const db = client.db(process.env.DB_NAME || 'crowdfundingDB');
  collections = {
    usersCol: db.collection('users'),
    campaignsCol: db.collection('campaigns'),
    contributionsCol: db.collection('contributions'),
    withdrawalsCol: db.collection('withdrawals'),
    notificationsCol: db.collection('notifications'),
    paymentsCol: db.collection('payments'),
    reportsCol: db.collection('reports'),
  };
  await client.db('admin').command({ ping: 1 });
  console.log('Connected to MongoDB');
  return collections;
}

export const addNotification = async (message, toEmail, actionRoute) => {
  await collections.notificationsCol.insertOne({ message, toEmail, actionRoute, time: new Date(), read: false });
};
