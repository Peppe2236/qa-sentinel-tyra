import fs from 'node:fs';
import path from 'node:path';

import PDFDocument from 'pdfkit';

import type {
  DashboardProject,
  DashboardRun,
  HumanReviewPack,
  RootCauseNote,
} from '../models/types';

function pdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\u0000-\u00ff]/g, '');
}

function writeHeading(doc: InstanceType<typeof PDFDocument>, title: string): void {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#102033').text(pdfText(title));
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor('#1b2b3d');
}

export async function writeExecutivePdf(input: {
  pack: HumanReviewPack;
  run: Pick<
    DashboardRun,
    | 'runId'
    | 'finishedAt'
    | 'health'
    | 'totalTests'
    | 'passed'
    | 'failed'
    | 'skipped'
    | 'releaseAssessment'
    | 'projects'
    | 'rootCauseNotes'
    | 'humanReview'
  >;
  reportsDirectory: string;
}): Promise<string> {
  const filePath = path.join(input.reportsDirectory, 'executive-report.pdf');
  fs.mkdirSync(input.reportsDirectory, { recursive: true });

  const pack = input.pack;
  const run = input.run;
  const notes: RootCauseNote[] =
    pack.rootCauseNotes ?? run.rootCauseNotes ?? [];
  const projects: DashboardProject[] = run.projects ?? [];

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: {
        Title: 'QA Sentinel Tyra executive report',
        Author: 'QA Sentinel Tyra',
      },
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#102033')
      .text('QA Sentinel Tyra');
    doc.font('Helvetica').fontSize(11).fillColor('#5b6b7c')
      .text('Executive report - short verdict, not a consultancy deck');
    doc.moveDown(0.6);

    doc.font('Helvetica-Bold').fontSize(28).fillColor(
      pack.verdict === 'GO'
        ? '#1f8a4c'
        : pack.verdict === 'NO-GO'
          ? '#c43c53'
          : '#b58112'
    ).text(pack.verdict);

    doc.font('Helvetica').fontSize(10).fillColor('#1b2b3d');
    doc.text(`Run ${pdfText(pack.runId)}`);
    doc.text(`Generated ${pdfText(pack.generatedAt)}`);
    doc.text(`Health ${run.health ?? 0}%  |  ${run.passed ?? 0} passed  |  ${run.failed ?? 0} failed  |  ${run.skipped ?? 0} skipped`);
    doc.text(`Release ${pdfText(run.releaseAssessment?.status ?? 'not recorded')}`);
    doc.text(`LLM ${pdfText(pack.llm?.label ?? 'LLM off - no key')}`);

    writeHeading(doc, 'Why this verdict');
    for (const bullet of pack.bullets.slice(0, 3)) {
      doc.text(`- ${pdfText(bullet)}`);
    }

    if (projects.length > 0) {
      writeHeading(doc, 'Two-project overview');
      for (const project of projects) {
        doc.text(
          `${pdfText(project.name)} (${pdfText(project.host)}): score ${project.passRate}%  |  ${project.failed} failed  |  ${project.passed}/${project.total} tests`
        );
      }
    }

    writeHeading(doc, 'Root cause');
    if (notes.length === 0) {
      doc.text('No failing-test root-cause notes for this run.');
    } else {
      for (const note of notes.slice(0, 6)) {
        doc.font('Helvetica-Bold').text(`${pdfText(note.theme)} · ${pdfText(note.site)}`);
        doc.font('Helvetica').text(pdfText(note.summary));
        doc.fillColor('#5b6b7c').text(pdfText(note.recommendation));
        doc.fillColor('#1b2b3d');
        doc.moveDown(0.25);
      }
    }

    writeHeading(doc, 'Top machine-owned issues');
    const machine = pack.machineOwned.slice(0, 8);
    if (machine.length === 0) {
      doc.text('None.');
    } else {
      for (const item of machine) {
        doc.text(
          `- ${pdfText(item.classification)} · ${pdfText(item.site)} · ${pdfText(item.title)}`
        );
        if (item.rootCause) {
          doc.fillColor('#5b6b7c').text(`  ${pdfText(item.rootCause)}`);
          doc.fillColor('#1b2b3d');
        }
      }
    }

    writeHeading(doc, 'Human queue');
    const human = pack.needsHuman.slice(0, 7);
    if (human.length === 0) {
      doc.text('Empty. No credential or ambiguous investigation items.');
    } else {
      for (const item of human) {
        doc.text(`- ${pdfText(item.title)}`);
        doc.fillColor('#5b6b7c').text(`  ${pdfText(item.whyHuman)}`);
        doc.fillColor('#1b2b3d');
      }
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#5b6b7c').text(
      'Heuristic root cause always runs. LLM enrichment is opt-in and fail-open. Production writes stay disabled.'
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}
