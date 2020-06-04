import { Board } from "./board";

test("New board listens for board and item snapshots", () => {
  let nextFn, errorFn;
  const mockOnSnapshot = jest.fn((n, e) => {
    nextFn = n;
    errorFn = e;
  });
  let subNextFn, subErrorFn;
  const mockSubOnSnapshot = jest.fn((n, e) => {
    subNextFn = n;
    subErrorFn = e;
  });
  const mockSubCollectionRef = {
    onSnapshot: mockSubOnSnapshot,
  };
  const mockSubCollection = jest.fn().mockReturnValue(mockSubCollectionRef);
  const mockDocReference = {
    onSnapshot: mockOnSnapshot,
    collection: mockSubCollection,
  };
  const mockDoc = jest.fn(() => mockDocReference);
  const mockCollectionRef = {
    doc: mockDoc,
  };
  const mockRootCollection = jest.fn().mockReturnValue(mockCollectionRef);
  const mockDb = {
    collection: mockRootCollection,
  };
  const board = new Board("some name", mockDb);
  expect(mockRootCollection).toHaveBeenCalledWith("boards");
  expect(mockDoc).toHaveBeenCalled();
  expect(mockSubCollection).toHaveBeenCalledWith("items");
  expect(mockOnSnapshot).toHaveBeenCalled();
  const mockDocSnapshot = {
    id: "8uyhjki",
    data: () => ({
      name: "A board name",
    }),
  };
  nextFn(mockDocSnapshot);
  expect(board.name).toEqual("A board name");
  // Add item
  const mockSubSnapshot = {};
  mockSubSnapshot.docChanges = jest.fn().mockReturnValue([
    {
      type: "added",
      doc: {
        id: "12efasd",
        data: () => ({ some: "prop" }),
      },
    },
  ]);
  subNextFn(mockSubSnapshot);
  expect(mockSubSnapshot.docChanges).toHaveBeenCalled();
  expect(board.getItem("12efasd")).toEqual({ some: "prop" });
  // Modify item
  mockSubSnapshot.docChanges = jest.fn().mockReturnValue([
    {
      type: "modified",
      doc: {
        id: "12efasd",
        data: () => ({ second: "foo" }),
      },
    },
  ]);
  subNextFn(mockSubSnapshot);
  expect(mockSubSnapshot.docChanges).toHaveBeenCalled();
  expect(board.getItem("12efasd")).toEqual({ second: "foo" });
  // Modify item
  mockSubSnapshot.docChanges = jest.fn().mockReturnValue([
    {
      type: "removed",
      doc: {
        id: "12efasd",
        data: () => ({ second: "foo" }),
      },
    },
  ]);
  subNextFn(mockSubSnapshot);
  expect(mockSubSnapshot.docChanges).toHaveBeenCalled();
  expect(board.getItem("12efasd")).toBe(undefined);
});

test("Changes propagate to DB", () => {
  const mockSubItemRef = {
    set: jest.fn(),
    delete: jest.fn(),
  };
  const mockSubCollection = {
    onSnapshot: () => undefined,
    doc: jest.fn().mockReturnValue(mockSubItemRef),
  };
  const mockDocRef = {
    onSnapshot: () => undefined,
    collection: jest.fn().mockReturnValue(mockSubCollection),
  };
  const mockDoc = {
    doc: jest.fn().mockReturnValue(mockDocRef),
  };
  const mockDb = {
    collection: jest.fn().mockReturnValue(mockDoc),
  };
  const board = new Board("Some ID", mockDb);
  const id = board.hold(
    { some: "prop" },
    { left: 0, top: 0, right: 100, bottom: 100 }
  );
  expect(mockDb.collection).toHaveBeenLastCalledWith("boards");
  expect(mockDocRef.collection).toHaveBeenLastCalledWith("items");
  expect(mockSubCollection.doc).toHaveBeenCalled();
  expect(mockSubItemRef.set).toHaveBeenCalled();
  board.removeItem(id);
  expect(mockDb.collection).toHaveBeenLastCalledWith("boards");
  expect(mockDocRef.collection).toHaveBeenLastCalledWith("items");
  expect(mockSubCollection.doc).toHaveBeenCalledWith(id);
  expect(mockSubItemRef.delete).toHaveBeenCalled();
});
