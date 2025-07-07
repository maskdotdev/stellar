import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./app.css";
import "./styles/react-pdf.css";

// Configure PDF.js worker
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { pdfjs } from 'react-pdf';

// Set up the PDF.js worker for version 3.4.120
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
