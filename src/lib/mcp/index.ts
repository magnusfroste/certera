import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSignedDiplomas from "./tools/listSignedDiplomas";
import listDesignSessions from "./tools/listDesignSessions";
import listTemplates from "./tools/listTemplates";
import createTemplate from "./tools/createTemplate";
import issueCertificates from "./tools/issueCertificates";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "certera-ink",
  title: "certera-ink",
  version: "0.2.0",
  instructions: "Tools for certera.ink, which turns a certificate design into signed, verifiable certificates. Save a finished design (static HTML + CSS with {{recipient_name}} where the name goes) with create_template, then issue one certificate per person with issue_certificates: each is recorded on Hedera and gets a public link. Issuing is real and permanent, so confirm the template and the names with the person first. You can also list templates, signed diplomas and design sessions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTemplates, createTemplate, issueCertificates, listSignedDiplomas, listDesignSessions],
});
