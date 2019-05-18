import { initializeApp, storage, firestore } from "firebase-admin";
import { spawn } from "child_process";
import * as kill from "tree-kill";
import * as mkdirp from "mkdirp";
import { unlinkSync } from "fs";

interface TestCase {
  input: string;
  expected: string;
  memoryLimit?: number;
  timeLimit?: number;
}

interface Grade {
  status: string;
  message: string;
  time: number;
}

initializeApp();
const bucket = storage().bucket();
const db = firestore();

const gradeTestCase = (filepath: string, test: TestCase) => {
  return new Promise<Grade>(res => {
    const startTime = new Date();
    let data = "";
    let finish = false;
    const child = spawn("node", [filepath]);
    if (test.timeLimit) {
      setTimeout(() => {
        if (!finish) {
          kill(child.pid);
          res({
            status: "T",
            message: "",
            time: new Date().getTime() - startTime.getTime()
          });
        }
      }, test.timeLimit);
    }
    child.stdout.on("data", e => {
      data += e.toString();
    });
    child.stderr.on("data", e => {
      res({
        status: "x",
        message: e.toString(),
        time: new Date().getTime() - startTime.getTime()
      });
    });
    child.stdout.on("close", () => {
      finish = true;
      res({
        status: data === test.expected ? "P" : "-",
        message: "",
        time: new Date().getTime() - startTime.getTime()
      });
    });
  });
};

export const gradeFile = async (filepath: string, tests: Array<TestCase>) => {
  const output = [];
  for (const test of tests) {
    output.push(await gradeTestCase(filepath, test));
  }
  return output;
};

export const getFile = (objPath: string) => {
  return new Promise((res, rej) => {
    const splittedPath = objPath.split("/");
    if (splittedPath.length > 1) {
      mkdirp(
        splittedPath.slice(0, splittedPath.length - 1).join("/"),
        async (err, made) => {
          await bucket.file(objPath).download({ destination: objPath });
          res();
        }
      );
    }
  });
};

const getProblemId = (objPath: string) => {
  const splittedPath = objPath.split("/");
  const problemId = splittedPath[splittedPath.length - 2];
  return problemId;
};

const getUserId = (objPath: string) => {
  const splittedPath = objPath.split("/");
  const userId = splittedPath[0];
  return userId;
};

export const getTestCases = async (objPath: string) => {
  const problemId = getProblemId(objPath);
  const problemRef = await db
    .collection("problem")
    .doc(problemId)
    .get();
  const problem = await problemRef.data();
  if (problem && problem.testcases) {
    return problem.testcases as TestCase[];
  } else {
    throw new Error();
  }
};

export const storeGrade = async (objPath: string, gradeList: Grade[]) => {
  const problemId = getProblemId(objPath);
  const userId = getUserId(objPath);
  await db.collection("grade").add({
    problemId,
    userId,
    gradeList
  });
};

export const removeFile = async (objPath: string) => {
  unlinkSync(objPath);
};
