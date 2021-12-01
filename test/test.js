const assert = require('assert');
const firebase = require('@firebase/testing');

const MY_PROJECT_ID = 'teams-demo-b6f30';
const myId = 'user_abc';
const theirId = 'user_xyz';
const myAuth = { uid: myId, email: 'abc@gmail.com' };
const theirAuth = { uid: theirId, email: 'xyz@gmail.com' }

function getFirestore(auth) {
    return firebase.initializeTestApp({ projectId: MY_PROJECT_ID, auth: auth }).firestore();
}

function getAdminFirestore() {
    return firebase.initializeAdminApp({ projectId: MY_PROJECT_ID }).firestore();
}

// beforeEach(async () => {
//     await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
// })

describe("Teams Security Rules Test Cases", () => {
    // it("understand addition", () => {
    //     assert.equal(2 + 2, 4);
    // })

    // READS 
    it("Read all documents of Projects if Signed In", async () => {
        const db = getFirestore(myAuth)
        const testDoc = db.collection("projects");
        await firebase.assertSucceeds(testDoc.get());
    })

    it("User Read all Projects where user is team member", async () => {
        const admin = getAdminFirestore();
        await admin.doc("projects/projectId1").set({ title: "dev", owner: [myId, "dummyuser"], editor: ["user_pqr"] })

        const db = getFirestore(myAuth)
        const testDoc = db.collection("projects").where("owner", "array-contains", myId);
        await firebase.assertSucceeds(testDoc.get());
    })

    it("Read all contents of a Project if Signed In", async () => {
        const projectPath = "projects/projectId7";
        const db = getFirestore(myAuth);
        const testDoc = db.doc(projectPath).collection("contents");
        await firebase.assertSucceeds(testDoc.get());
    })


    //ADD
    it("Can Add Project if Signed In", async () => {
        const db = getFirestore(myAuth);
        const testDoc = db.collection("projects").doc("projectId3");
        await firebase.assertSucceeds(testDoc.set({ title: "Technical", description: "fdsfsdfdsdf", owner: [myId] }));
    })

    it("Can Add Content to Project where User is a team Member", async () => {
        const contentPath = "projects/projectId1/contents/contentId1";
        const db = getFirestore(myAuth); //owner in projectId1
        const testDoc = db.doc(contentPath);
        await firebase.assertSucceeds(testDoc.set({ heading: "content 1", body: "fdsfsdfdsdf", author: myId }));
    })

    it("Can't Add Content to Project where User is NOT team Member", async () => {
        const contentPath = "projects/projectId1/contents/contentId1";
        const db = getFirestore(theirAuth); //viewer for projectId1
        const testDoc = db.doc(contentPath);
        await firebase.assertFails(testDoc.set({ heading: "content 1", body: "fdsfsdfdsdf", author: theirId }));
    })

    //UPDATES
    it("Can update project details if Owner or Manager", async () => {
        const projectPath = "projects/projectId2";
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech", manager: [myId, "dummy"], owner: [theirId, "dummy"] });

        const db = getFirestore(myAuth); //manager
        // const db = getFirestore(theirAuth); //owner
        const testDoc = db.doc(projectPath);
        await firebase.assertSucceeds(testDoc.update({ title: "foo" }));
    })

    it("Can't update project details if Editor or Viewer", async () => {
        const projectPath = "projects/projectId4";
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News", editor: [myId, "dummy"], owner: ["dummy2", "dummy"] });

        const db = getFirestore(myAuth); //editor
        // const db = getFirestore(theirAuth); //viewer
        const testDoc = db.doc(projectPath);
        await firebase.assertFails(testDoc.update({ title: "foo" }));
    })

    it("Update Contents of project where User is team member and author", async () => {
        const projectPath = "projects/projectId7";
        const contentPath = `${projectPath}/contents/contentId1`
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News with content", editor: [myId, "dummy"], owner: ["dummy2", "dummy"] });
        await admin.doc(contentPath).set({ heading: "Content 1", body: "dsfhljdsfjsdf", author: myId })

        const db = getFirestore(myAuth); //author and editor
        const testDoc = db.doc(contentPath);
        await firebase.assertSucceeds(testDoc.update({ body: "foo" }));
    })

    it("Can't Update Contents of project where User is team member but NOT author", async () => {
        const projectPath = "projects/projectId7";
        const contentPath = `${projectPath}/contents/contentId1`
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News with content", editor: [myId, "dummy"], owner: ["dummy2", "dummy"] });
        await admin.doc(contentPath).set({ heading: "Content 1", body: "dsfhljdsfjsdf", author: theirId })

        const db = getFirestore(myAuth); //author and editor
        const testDoc = db.doc(contentPath);
        await firebase.assertFails(testDoc.update({ body: "foo" }));
    })

    it("Can't Update Contents of project where User is NOT team member", async () => {
        const projectPath = "projects/projectId7";
        const contentPath = `${projectPath}/contents/contentId1`
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News with content", editor: [myId, "dummy"], owner: ["dummy2", "dummy"] });
        await admin.doc(contentPath).set({ heading: "Content 1", body: "dsfhljdsfjsdf", author: theirId })

        const db = getFirestore(theirAuth); //viewer
        const testDoc = db.doc(contentPath);
        await firebase.assertFails(testDoc.update({ body: "foo" }));
    })

    //DELETE
    it("Can delete project if Owner of Project", async () => {
        const projectPath = "projects/projectId5";
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News", manager: [myId, "dummy"], owner: [theirId, "dummy"] });

        const db = getFirestore(theirAuth);
        const testDoc = db.doc(projectPath);
        await firebase.assertSucceeds(testDoc.delete());
    })

    it("Can't delete project if NOT Owner of Project", async () => {
        const projectPath = "projects/projectId6";
        const admin = getAdminFirestore();
        await admin.doc(projectPath).set({ title: "Tech News", manager: [myId, "dummy"], owner: [theirId, "dummy"] });

        const db = getFirestore(myAuth); //manager
        const testDoc = db.doc(projectPath);
        await firebase.assertFails(testDoc.delete());
    })

    it("Can delete content of a project if Author of Content", async () => {
        const contentPath = "projects/projectId1/contents/contentId2";
        const admin = getAdminFirestore();
        await admin.doc(contentPath).set({ heading: "Tech News", author: "user_pqr" });

        const db = getFirestore({ uid: "user_pqr", email: "tt@g.cm" }); //author and editor
        const testDoc = db.doc(contentPath);
        await firebase.assertSucceeds(testDoc.delete());
    })

    it("Can delete content of a project if Owner/Manager of Project", async () => {
        const contentPath = "projects/projectId1/contents/contentId2";
        const admin = getAdminFirestore();
        await admin.doc(contentPath).set({ heading: "Tech News", author: "user_pqr" });

        const db = getFirestore(myAuth); //owner
        const testDoc = db.doc(contentPath);
        await firebase.assertSucceeds(testDoc.delete());
    })

    it("Can't delete content of a project if NOT Author and NOT Owner/Manager of Project", async () => {
        const contentPath = "projects/projectId1/contents/contentId2";
        const admin = getAdminFirestore();
        await admin.doc(contentPath).set({ heading: "Tech News", author: "user_pqr" });

        const db = getFirestore(theirAuth); //viewer
        const testDoc = db.doc(contentPath);
        await firebase.assertFails(testDoc.delete());
    })


    // it("Can Read all documents", async () => {
    //     const db = getFirestore(null)
    //     const testDoc = db.collection("readonly");
    //     await firebase.assertSucceeds(testDoc.get());
    // })

    // it("Cant write collection", async () => {
    //     const db = getFirestore(null)
    //     const testDoc = db.collection("readonly").doc("testDoc2");
    //     await firebase.assertFails(testDoc.set({ foo: "bar" }));
    // })

    // it("Can write to user document with same ID as our user", async () => {
    //     const db = getFirestore(myAuth);
    //     const testDoc = db.collection("users").doc(myId);
    //     await firebase.assertSucceeds(testDoc.set({ foo: "bar" }));
    // })

    // it("Cant write to user document with different ID as our user", async () => {
    //     const db = getFirestore(myAuth);
    //     const testDoc = db.collection("users").doc(theirId);
    //     await firebase.assertFails(testDoc.set({ foo: "bar" }));
    // })
    // it("Read post that are public", async () => {
    //     const db = getFirestore(null);
    //     const testQuery = db.collection("posts").where("visibility", "==", "public");
    //     await firebase.assertSucceeds(testQuery.get());
    // })
    // it("Cant query all posts", async () => {
    //     const db = getFirestore(myAuth);
    //     const testQuery = db.collection("posts");
    //     await firebase.assertFails(testQuery.get());
    // })
    // it("Can read single posts", async () => {
    //     // admin trespasses all security rules 
    //     // to create a document without encountering any security rules
    //     const admin = getAdminFirestore();
    //     const postId = 'public_post';
    //     const setupDoc = admin.collection("posts").doc(postId);
    //     await setupDoc.set({ authorId: theirId, visibility: "public" });

    //     const db = getFirestore(null);
    //     const testRead = db.collection("posts").doc("public_post");
    //     await firebase.assertSucceeds(testRead.get());
    // })



})

// after(async () => {
//     await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
// })

// rules_version = '2';
// service cloud.firestore {
//    match /databases/{database}/documents {
//      match /{document=**} {
//         allow read, write: if false;
//      }
//      match /readonly/{docId}{
//        allow read: if true;
//        allow write: if false;  
//      }
//      match /users/{userId}{
//        allow write: if (request.auth.uid == userId);
//      }
//      match /posts/{postId}{
//        allow read: if (resource.data.visibility == "public" || resource.data.authorId == request.auth.uid);
//      }
//    }
// }