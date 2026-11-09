import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSignedDiplomas from "./tools/listSignedDiplomas";
import listDesignSessions from "./tools/listDesignSessions";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "certera-ink",
  title: "certera-ink",
  version: "0.1.0",
  instructions: "Tools for certera.ink. List the diplomas you have signed on Hedera (with verification links) and your diploma design sessions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSignedDiplomas, listDesignSessions],
});
