import { Store } from "./store";

test("store subscribe returns newly created docs with ID", (done) => {
  const fakeDb = createFakeDb();
  const store = new Store(fakeDb);
  const docPath = ["collection-name", "KMRNSDGXCV"];
  const docToCreate = {
    name: "Some property",
  };
  const unsubscribe = store.subscribe(
    docPath,
    (receivedDoc) => {
      expect(receivedDoc).toEqual({ KMRNSDGXCV: docToCreate });
      unsubscribe();
      done();
    },
    done
  );
  store.create(docPath, docToCreate);
});

test("store subscribe returns newly created docs", (done) => {
  const fakeDb = createFakeDb();
  const store = new Store(fakeDb);
  const docPath = ["collection-name"];
  const docToCreate = {
    name: "Some property",
  };
  const unsubscribe = store.subscribe(
    docPath,
    (receivedDoc) => {
      expect(Object.entries(receivedDoc)).toEqual(
        expect.arrayContaining([expect.arrayContaining([docToCreate])])
      );
      unsubscribe();
      done();
    },
    done
  );
  store.create(docPath, docToCreate);
});

test("store subscribe returns newly created docs in subcollection, but not in parent", (done) => {
  const fakeDb = createFakeDb();
  const store = new Store(fakeDb);
  const docPath = ["collection-name", "$RFGYT%$ED", "sub-collection"];
  const docToCreate = {
    name: "Some property",
  };
  const callbackWeDoNotExpect = jest.fn();
  const unsub1 = store.subscribe(
    ["collection-name"],
    callbackWeDoNotExpect,
    done
  );
  const unsub2 = store.subscribe(
    ["collection-name", "$RFGYT%$ED"],
    callbackWeDoNotExpect,
    done
  );
  const unsub3 = store.subscribe(
    docPath,
    (receivedDoc) => {
      expect(Object.entries(receivedDoc)).toEqual(
        expect.arrayContaining([expect.arrayContaining([docToCreate])])
      );
      expect(callbackWeDoNotExpect).not.toHaveBeenCalled();
      unsub1();
      unsub2();
      unsub3();
      done();
    },
    done
  );
  store.create(docPath, docToCreate);
});

function createFakeDb() {
  let idGen = 0;
  const fakeDb = {
    collection: getFakeCollection,
  };
  const fakeCollections = {};
  function getFakeCollection(collectionName) {
    return (
      fakeCollections[collectionName] ||
      (fakeCollections[collectionName] = {
        _callbacks: [],
        onSnapshot: function (next, err) {
          this._callbacks.push(next);
          return () => {
            this._callbacks = this._callbacks.filter((curCb) => curCb !== next);
          };
        },
        doc: getFakeDocRef,
        add: (data) => Promise.resolve({ id: ++idGen }),
      })
    );
  }
  const fakeDocRefs = {};
  function getFakeDocRef(id) {
    return (
      fakeDocRefs[id] ||
      (fakeDocRefs[id] = {
        _callbacks: [],
        onSnapshot: function (next, err) {
          this._callbacks.push(next);
          return () => {
            this._callbacks = this._callbacks.filter((curCb) => curCb !== next);
          };
        },
        set: function (data) {
          this._callbacks.forEach((cb) => cb({ id: id, data: () => data }));
          return Promise.resolve({ id });
        },
        collection: getFakeCollection,
      })
    );
  }
  return fakeDb;
}
