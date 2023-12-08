import React from 'react';
import {
  Divider,
  List,
  ListItem,
  ListItemText,
}
from '@mui/material';
import { Link } from 'react-router-dom';
import './userList.css';
// import fetchModel from "../../lib/fetchModelData";
import axios from 'axios'; 

// import sidebar component
import Sidebar from '../sidebar/sidebar';

/**
 * Define UserList, a React component of project #5
 */
class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      userListModel: undefined,
      user_id: undefined
    };
  }

  
    componentDidMount() {
        this.handleUserListChange();
    }

    componentDidUpdate() {
      const new_user_id = this.props.match?.params.userId;
      const current_user_id = this.state.user_id;
      if (current_user_id  !== new_user_id){
          this.handleUserChange(new_user_id);
      }
  }

  handleUserChange(user_id){
    this.setState({
        user_id: user_id
    });
  }


    handleUserListChange(){
       axios.get("/user/list")
          .then((response) =>
          {
              this.setState({
                userListModel: response.data
              });
          });
    }

  render() {
    const { userListModel } = this.state;
   return userListModel ? 
     (
      <div>
        {userListModel.map((user) => (
          <Link to={`/users/${user._id}`} key={user._id} className="userlink">
            <List component="nav" className="userlist">
              <ListItem>
                <ListItemText primary={`${user.first_name} ${user.last_name}`} />
              </ListItem>
              <Divider />
            </List>
          </Link>
        ))}
        <Sidebar/>
      </div>
      ) : ( <div />);
  }
}

export default UserList;
