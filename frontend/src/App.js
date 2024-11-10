import './App.css'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Chat from './components/Chat';
import Admin from './components/Admin';
import { Component } from 'react'
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';


class App extends Component {
  constructor() {
    super()
  }

  render() {   
    let location_ = window.location.href.split("/")
    location_ = location_[location_.length - 1]
    location_ = `/${location_}`
    console.log(location_)
    return (
       <Router>
          <div className="App">
              <Navbar bg="dark" variant="dark">
                <Container>
                  {/* <Navbar.Brand href="/chat">ChatSOS</Navbar.Brand> */}
                  <Nav activeKey={location_}  className="me-auto">
                    <Nav.Link href="/chat">Chat</Nav.Link>
                    <Nav.Link href="/admin">Settings</Nav.Link>
                  </Nav>
                </Container>
              </Navbar>
          </div>


          <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route exact path='/chat' element={< Chat />} />
              <Route exact path='/admin' element={< Admin />} />
          </Routes>
       </Router>
   );
  }
}
export default App;
