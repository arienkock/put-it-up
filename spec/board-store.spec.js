const { ConnectedBoard } = require("../src/board.js");

describe("Board store", () => {
  it("New board handles board and item snapshots", () => {
    let nextFn, errorFn;
    const mockOnSnapshot = jasmine.createSpy().and.callFake((n, e) => {
      nextFn = n;
      errorFn = e;
    });
    let subNextFn, subErrorFn;
    const mockSubOnSnapshot = jasmine.createSpy().and.callFake((n, e) => {
      subNextFn = n;
      subErrorFn = e;
    });
    const mockSubCollectionRef = {
      onSnapshot: mockSubOnSnapshot,
    };
    const mockSubCollection = jasmine
      .createSpy()
      .and.returnValue(mockSubCollectionRef);
    const mockDocReference = {
      onSnapshot: mockOnSnapshot,
      collection: mockSubCollection,
    };
    const mockDoc = jasmine.createSpy().and.callFake(() => mockDocReference);
    const mockCollectionRef = {
      doc: mockDoc,
    };
    const mockRootCollection = jasmine
      .createSpy()
      .and.returnValue(mockCollectionRef);
    const mockDb = {
      collection: mockRootCollection,
    };
    const board = new ConnectedBoard("some id", mockDb);
    const mockListener = jasmine.createSpy();
    board.addListener(mockListener);
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
    expect(board.getName()).toEqual("A board name");
    // Add item
    const mockSubSnapshot = {};
    mockSubSnapshot.docChanges = jasmine.createSpy().and.returnValue([
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
    expect(board.get("12efasd")).toEqual({ some: "prop" });
    // Modify item
    mockSubSnapshot.docChanges = jasmine.createSpy().and.returnValue([
      {
        type: "modified",
        doc: {
          id: "12efasd",
          data: () => ({ second: "foo" }),
        },
      },
    ]);
    mockListener.calls.reset();
    subNextFn(mockSubSnapshot);
    expect(mockSubSnapshot.docChanges).toHaveBeenCalled();
    expect(mockListener).toHaveBeenCalled();
    expect(board.get("12efasd")).toEqual({ second: "foo" });
    // Modify item
    mockSubSnapshot.docChanges = jasmine.createSpy().and.returnValue([
      {
        type: "removed",
        doc: {
          id: "12efasd",
          data: () => ({ second: "foo" }),
        },
      },
    ]);
    mockListener.calls.reset();
    subNextFn(mockSubSnapshot);
    expect(mockSubSnapshot.docChanges).toHaveBeenCalled();
    expect(mockListener).toHaveBeenCalled();
    expect(board.get("12efasd")).toBe(undefined);
  });

  it("Changes propagate to DB", () => {
    const mockSubItemRef = {
      set: jasmine.createSpy(),
      delete: jasmine.createSpy(),
      update: jasmine.createSpy(),
    };
    const mockSubCollection = {
      onSnapshot: () => undefined,
      doc: jasmine.createSpy().and.returnValue(mockSubItemRef),
    };
    const mockDocRef = {
      onSnapshot: () => undefined,
      collection: jasmine.createSpy().and.returnValue(mockSubCollection),
      update: jasmine.createSpy(),
    };
    const mockDoc = {
      doc: jasmine.createSpy().and.returnValue(mockDocRef),
    };
    const mockDb = {
      collection: jasmine.createSpy().and.returnValue(mockDoc),
    };
    const board = new ConnectedBoard("Some ID", mockDb);
    const mockListener = jasmine.createSpy();
    board.addListener(mockListener);
    function clearMocks() {
      [
        mockSubItemRef.delete,
        mockSubItemRef.set,
        mockSubItemRef.update,
        mockSubCollection.doc,
        mockDocRef.collection,
        mockDoc.doc,
        mockDb.collection,
        mockListener,
      ].forEach((m) => m.calls.reset());
    }
    // Add
    const id = board.add({
      item: { some: "prop" },
      boundingRectangle: { left: 0, top: 0, right: 100, bottom: 100 },
    });
    expect(mockDb.collection).toHaveBeenCalledWith("boards");
    expect(mockDocRef.collection).toHaveBeenCalledWith("items");
    expect(mockSubCollection.doc).toHaveBeenCalled();
    expect(mockSubItemRef.set).toHaveBeenCalled();
    expect(mockListener).toHaveBeenCalled();
    clearMocks();

    // Move
    board.move(id, { left: 100, top: 100, right: 200, bottom: 200 });
    expect(mockDb.collection).toHaveBeenCalledWith("boards");
    expect(mockDocRef.collection).toHaveBeenCalledWith("items");
    expect(mockSubItemRef.update).toHaveBeenCalledWith({
      boundingRectangle: { left: 100, top: 100, right: 200, bottom: 200 },
    });
    clearMocks();

    // Remove
    board.remove(id);
    expect(mockDb.collection).toHaveBeenCalledWith("boards");
    expect(mockDocRef.collection).toHaveBeenCalledWith("items");
    expect(mockSubCollection.doc).toHaveBeenCalledWith(id);
    expect(mockSubItemRef.delete).toHaveBeenCalled();
    expect(mockListener).toHaveBeenCalled();
    clearMocks();

    // Change board name
    board.setName("New name");
    expect(board.getName()).toBe("New name");
    expect(mockDocRef.update).toHaveBeenCalledWith({ name: "New name" });
  });
});
