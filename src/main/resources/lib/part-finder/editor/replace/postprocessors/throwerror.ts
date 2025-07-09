import { ContentitemMutatingPostprocessorFunc } from "/lib/part-finder/editor/replace/postprocessors";

export const throwerror: ContentitemMutatingPostprocessorFunc = () => {
  throw Error("Testing in-postprocessor error handling");
};
