import { Store } from "./store";
import * as firebase from "@firebase/testing";

const projectId = "my-test-project";
let db;

beforeAll(() => {
  const app = firebase.initializeTestApp({
    projectId,
    auth: { uid: "alice", email: "alice@example.com" },
  });
  db = app.firestore();
});

afterEach(() => {
  firebase.clearFirestoreData({
    projectId,
  });
});

afterAll(() => Promise.all(firebase.apps().map((app) => app.delete())));

test("store subscribe returns changes", (done) => {
  const store = new Store(db);
  const docPath = ["collection-name", "KMRNSDGXCV"];
  const createdDoc = {
    name: "Some property",
  };
  const unsubscribe = store.subscribe(
    docPath,
    (receivedDoc) => {
      expect(receivedDoc).toEqual(createdDoc);
      unsubscribe();
      done();
    },
    done
  );
  store.create(docPath, createdDoc);
});
