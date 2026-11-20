import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import EquipmentManagement from './pages/EquipmentManagement';
import EquipmentList from './pages/EquipmentList';
import EquipmentDetails from './pages/EquipmentDetails';
import './styles/equipment-management.css';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={EquipmentManagement} />
        <Route path="/equipment" exact component={EquipmentList} />
        <Route path="/equipment/:id" component={EquipmentDetails} />
      </Switch>
    </Router>
  );
}

export default App;