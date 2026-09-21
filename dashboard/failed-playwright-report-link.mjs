const HTML_REPORT =
  '/reports/failed-playwright-report.html';

const PDF_REPORT =
  '/reports/failed-playwright-report.pdf';

function locale() {
  return (
    window.QaSentinelI18n?.locale ||
    document.documentElement.lang ||
    'en'
  );
}

function labels() {
  if (locale().toLowerCase().startsWith('sv')) {
    return {
      html: 'Misslyckade Playwright-tester',
      pdf: 'Misslyckade Playwright-tester PDF',
    };
  }

  return {
    html: 'Failed Playwright Tests',
    pdf: 'Failed Playwright Tests PDF',
  };
}

function setLabel(anchor, label) {
  const strong =
    anchor.querySelector('strong');

  if (strong) {
    if (strong.textContent !== label) {
      strong.textContent = label;
    }
    return;
  }

  const span =
    anchor.querySelector(
      'span:last-child'
    );

  if (span) {
    if (span.textContent !== label) {
      span.textContent = label;
    }
    return;
  }

  if (anchor.textContent !== label) {
    anchor.textContent = label;
  }
}

function createFrom(
  template,
  href,
  kind
) {
  const link =
    template.cloneNode(true);

  link.removeAttribute(
    'data-v5-i18n'
  );

  for (
    const node of link.querySelectorAll(
      '[data-v5-i18n]'
    )
  ) {
    node.removeAttribute(
      'data-v5-i18n'
    );
  }

  link.dataset.failedPlaywrightReport =
    kind;

  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';

  setLabel(
    link,
    labels()[kind]
  );

  return link;
}

function inject() {
  const existingHtml =
    document.querySelector(
      '[data-failed-playwright-report="html"]'
    );

  const existingPdf =
    document.querySelector(
      '[data-failed-playwright-report="pdf"]'
    );

  if (
    existingHtml &&
    existingPdf
  ) {
    setLabel(
      existingHtml,
      labels().html
    );

    setLabel(
      existingPdf,
      labels().pdf
    );

    return;
  }

  const anchors =
    [
      ...document.querySelectorAll(
        'a[href]'
      ),
    ];

  const htmlTemplate =
    anchors.find(anchor =>
      /\/reports\/latest-report\.html/i.test(
        anchor.getAttribute('href') ?? ''
      )
    );

  const pdfTemplate =
    anchors.find(anchor =>
      /\/reports\/executive-report\.pdf/i.test(
        anchor.getAttribute('href') ?? ''
      )
    ) ??
    htmlTemplate;

  if (!htmlTemplate) {
    return;
  }

  if (!existingHtml) {
    htmlTemplate.insertAdjacentElement(
      'afterend',
      createFrom(
        htmlTemplate,
        HTML_REPORT,
        'html'
      )
    );
  }

  if (
    pdfTemplate &&
    !existingPdf
  ) {
    pdfTemplate.insertAdjacentElement(
      'afterend',
      createFrom(
        pdfTemplate,
        PDF_REPORT,
        'pdf'
      )
    );
  }
}

inject();

const observer =
  new MutationObserver(
    () => inject()
  );

observer.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);

document.addEventListener(
  'qa-sentinel-language-change',
  () => inject()
);
