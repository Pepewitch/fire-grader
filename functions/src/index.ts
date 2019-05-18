import * as functions from "firebase-functions";
import { getFile, getTestCases, gradeFile, storeGrade, removeFile } from "./grader";

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const update = functions.storage.object().onFinalize(async obj => {
  try {
    const { name } = obj;
    if (name) {
      const testcases = await getTestCases(name);
      await getFile(name);
      const gradeList = await gradeFile(name, testcases);
      await storeGrade(name, gradeList);
      await removeFile(name);
    }
  } catch (error) {
    console.error(error.toString());
  }
});
