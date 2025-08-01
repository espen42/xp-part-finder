import { hasRole as hasAuthRole } from "/lib/xp/auth";
import { getParamBool, PartFinderQueryParams, PARAM } from "/lib/part-finder/utils/params";
import { runReplaceAndSummarize } from "/lib/part-finder/stages/replace/post";
import { runCleanupAndSummarize } from "/lib/part-finder/stages/cleanup/post";
import { findAndPresentComponentUsages } from "/lib/part-finder/stages/finder/get";

//------------------------------- GET request handler: the old "pure" part-finder stage --------------------------------

export const get = (req: XP.Request<PartFinderQueryParams>): XP.Response => findAndPresentComponentUsages(req);

//------------------------------- POST request handler: the two part-mover stages - replace and cleanup ----------------

// TODO: parameterize the Request
export const post = (req: XP.Request): XP.Response => {
  if (!hasAuthRole("system.admin")) {
    return {
      status: 403,
      body: "FORBIDDEN",
    };
  }

  const isCleanupStage = getParamBool(req, PARAM.cleanup);
  return !isCleanupStage ? runReplaceAndSummarize(req) : runCleanupAndSummarize(req);
};
