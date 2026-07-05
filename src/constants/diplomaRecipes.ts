// Curated "recipe" presets shown as visual thumbnails on the landing page.
// Each recipe renders a real preview via the client-side DSL renderer and,
// when picked, seeds generation with a prompt that steers the AI toward the
// same known-good look.
import type { DiplomaDSL } from '@/diploma-dsl/types';

export interface DiplomaRecipe {
  id: string;
  label: string;
  /** Prompt sent to generation when the recipe is picked */
  prompt: string;
  /** Sample design used only to render the thumbnail */
  dsl: DiplomaDSL;
}

const sampleBody = (title: string, description: string, course?: string): DiplomaDSL['body'] => ({
  title,
  preText: 'This is to certify that',
  recipientName: 'Alex Morgan',
  description,
  courseOrProgram: course,
  date: 'June 2026',
});

export const DIPLOMA_RECIPES: DiplomaRecipe[] = [
  {
    id: 'classic-university',
    label: 'Classic University',
    prompt: 'A classic university diploma with a formal serif design, ornate border and a laurel-wreath seal.',
    dsl: {
      brand: { name: 'Ashford University', primaryColor: '#0f1b3d', accentColor: '#c9a84c' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'parchment' },
      header: { style: 'serif-centered', institutionName: 'Ashford University', subtitle: 'Est. 1897' },
      border: { style: 'classical' },
      body: sampleBody('Diploma of Excellence', 'has successfully completed all requirements and is awarded this diploma with honors.', 'Bachelor of Science'),
      seal: { style: 'laurel-wreath', position: 'bottom-right', text: 'HONORS' },
      signature: { style: 'handwriting', name: 'Dr. E. Hart', title: 'Dean' },
    },
  },
  {
    id: 'modern-tech',
    label: 'Modern Tech',
    prompt: 'A modern minimalist tech bootcamp completion certificate with clean lines and a digital signature.',
    dsl: {
      brand: { name: 'Nova Academy', primaryColor: '#0c2a3a', accentColor: '#2d8a9e' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'clean-white' },
      header: { style: 'minimal', institutionName: 'NOVA ACADEMY', subtitle: 'Software Engineering' },
      border: { style: 'modern' },
      body: sampleBody('Certificate of Completion', 'has completed the Full-Stack Development program and demonstrated professional proficiency.', 'Full-Stack Development'),
      seal: { style: 'modern-circle', position: 'bottom-right' },
      signature: { style: 'digital', name: 'J. Rivera', title: 'Program Lead' },
    },
  },
  {
    id: 'elegant-gold',
    label: 'Elegant Gold',
    prompt: 'An elegant gold-bordered certificate with a flowing script header and an ornamental frame.',
    dsl: {
      brand: { name: 'Belle Académie', primaryColor: '#5b2c20', accentColor: '#c6a961' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'ivory' },
      header: { style: 'elegant-script', institutionName: 'Belle Académie', subtitle: 'School of Fine Arts' },
      border: { style: 'ornamental' },
      body: sampleBody('Certificate of Achievement', 'is hereby recognized for outstanding dedication and artistic accomplishment.', 'Fine Arts Diploma'),
      seal: { style: 'classical-round', position: 'bottom-right', text: 'CERTIFIED' },
      signature: { style: 'elegant', name: 'M. Laurent', title: 'Director' },
    },
  },
  {
    id: 'corporate-award',
    label: 'Corporate Award',
    prompt: 'A corporate award certificate with a bold art-deco frame and a shield seal.',
    dsl: {
      brand: { name: 'Meridian Group', primaryColor: '#2d3748', accentColor: '#3b6fa0' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'marble' },
      header: { style: 'bold-caps', institutionName: 'MERIDIAN GROUP', subtitle: 'Leadership Program' },
      border: { style: 'art-deco' },
      body: sampleBody('Award of Distinction', 'is recognized for exceptional leadership and measurable impact across the organization.', 'Leadership Excellence'),
      seal: { style: 'shield', position: 'bottom-right', text: 'AWARD' },
      signature: { style: 'formal', name: 'S. Okafor', title: 'CEO' },
    },
  },
  {
    id: 'botanical',
    label: 'Botanical',
    prompt: 'A botanical-themed certificate with vine borders and soft greens.',
    dsl: {
      brand: { name: 'Green Roots Institute', primaryColor: '#1a3c2a', accentColor: '#8b7355' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'botanical-green' },
      header: { style: 'serif-centered', institutionName: 'Green Roots Institute', subtitle: 'Sustainability Studies' },
      border: { style: 'botanical-vine' },
      body: sampleBody('Certificate of Completion', 'has completed the Regenerative Design program with distinction.', 'Regenerative Design'),
      seal: { style: 'rosette', position: 'bottom-right', text: 'AWARD' },
      signature: { style: 'handwriting', name: 'L. Chen', title: 'Head of Studies' },
    },
  },
  {
    id: 'dark-premium',
    label: 'Dark Premium',
    prompt: 'A premium dark diploma with gold accents on a deep navy background and a star seal.',
    dsl: {
      brand: { name: 'Apex Institute', primaryColor: '#f0e6d3', accentColor: '#c6a961' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'cosmic-dark' },
      header: { style: 'monumental', institutionName: 'APEX INSTITUTE', subtitle: 'Executive Education' },
      border: { style: 'geometric-deco', color: '#c6a961' },
      body: sampleBody('Diploma of Distinction', 'has successfully completed the Executive Leadership program.', 'Executive Leadership'),
      seal: { style: 'star', position: 'bottom-right' },
      signature: { style: 'elegant', name: 'R. Vance', title: 'President' },
    },
  },
];
