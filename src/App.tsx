import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/project/:id" element={<div>Project Detail</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
