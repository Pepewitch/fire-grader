import * as functions from "firebase-functions";
import {
  getFile,
  getTestCases,
  gradeFile,
  storeGrade,
  removeFile
} from "./grader";
import { join } from "path";
import { tmpdir } from "os";

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const update = functions.storage.object().onFinalize(async obj => {
  try {
    const { name } = obj;
    if (name) {
      const filepath = join(tmpdir(), name);
      const testcases = await getTestCases(name);
      await getFile(name, filepath);
      const gradeList = await gradeFile(filepath, testcases);
      await storeGrade(name, gradeList);
      await removeFile(filepath);
    }
  } catch (error) {
    console.error(error.toString());
  }
});
