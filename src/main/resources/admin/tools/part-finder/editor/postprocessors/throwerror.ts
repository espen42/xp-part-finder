import { ContentitemMutatingPostprocessorFunc } from "/admin/tools/part-finder/editor/postprocessors/index";

export const throwerror: ContentitemMutatingPostprocessorFunc = () => {
  throw Error("Testing in-postprocessor error handling");
};
