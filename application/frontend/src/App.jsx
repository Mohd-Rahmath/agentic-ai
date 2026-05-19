import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RagPage from "./pages/RagPage.jsx";
import AgenticLocationFinderPage from "./pages/AgenticLocationFinderPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RagPage />} />
        <Route path="/location" element={<AgenticLocationFinderPage />} />
      </Routes>
    </BrowserRouter>
  );
}
