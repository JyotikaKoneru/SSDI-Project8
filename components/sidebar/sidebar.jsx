import React from 'react';
import axios from 'axios';


/**
 * Define TopBar, a React component of project #5
 */
class Sidebar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            activityList: '',
          };
        
    }
    componentDidMount() {
        axios.get('/activityList').then((result)=>{
            this.setState({
                activityList: result.data
            })

            console.log(this.state.activityList)
        }).catch(err=>{console.log(err)});
    }
    render() {

    return this.state.activityList ? 
    (
     <div>
       {this.state.activityList.map((activity) => (
         <ul>
            <li>{activity.description}</li>
         </ul>
       ))}
     </div>
     ) : ( <div>Nothing to render</div>);
    }
}

export default Sidebar;
