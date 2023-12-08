import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Alert,
  Snackbar,
  TextField,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import "./TopBar.css";
import axios from "axios";

/**
 * Define TopBar, a React componment of project #5
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      app_version: undefined,
      photo_upload_show: false,
      photo_upload_error: false,
      photo_upload_success: false,
      sharingList: [],
      availableUsers: [],
      userList: [],
      userData: "",
      isPrivate: false,
    };
    this.handleLogout = this.handleLogout.bind(this);
    this.handleNewPhoto = this.handleNewPhoto.bind(this);
    this.handleSharingListChange = this.handleSharingListChange.bind(this);
    this.fetchAvailableUsers = this.fetchAvailableUsers.bind(this);
    this.handlePrivateCheckboxChange =
      this.handlePrivateCheckboxChange.bind(this);
  }

  componentDidMount() {
    this.handleAppVersionChange();
  }

  fetchAvailableUsers() {
    axios
      .get("/user/list")
      .then((response) => {
        const users = response.data.map((user) => user.first_name);
        this.setState({ userData: response.data, availableUsers: users });
      })
      .catch((error) => {
        console.error("Error fetching user list:", error);
      });
  }

  handlePrivateCheckboxChange = () => {
    this.setState((prevState) => ({
      isPrivate: !prevState.isPrivate,
    }));
  };

  handleAppVersionChange() {
    const app_version = this.state.app_version;
    if (app_version === undefined) {
      axios.get("/test/info").then((response) => {
        this.setState({
          app_version: response.data,
        });
      });
    }
  }

  handleSharingListChange = (event, value) => {
    const { userData } = this.state;

    this.setState({
      userList: value,
      sharingList: userData
        .filter((user) => value.includes(user.first_name))
        .map((user) => user._id),
    });
  };

  handleNewPhoto = (e) => {
    e.preventDefault();
    if (this.uploadInput.files.length > 0) {
      const domForm = new FormData();
      domForm.append("uploadedphoto", this.uploadInput.files[0]);
      domForm.append("sharingList", JSON.stringify(this.state.sharingList));
      domForm.append("isPrivate", this.state.isPrivate); // Include isPrivate
      axios
        .post("/photos/new", domForm)
        .then(() => {
          this.setState({
            photo_upload_show: true,
            photo_upload_error: false,
            photo_upload_success: true,
            sharingList: [],
            userList: [],
            isPrivate: false,
          });
        })
        .catch((error) => {
          this.setState({
            photo_upload_show: true,
            photo_upload_error: true,
            photo_upload_success: false,
          });
          console.log(error);
        });
    }
  };

  handleLogout = () => {
    axios
      .post("/admin/logout")
      .then(() => {
        this.props.changeUser(undefined);
      })
      .catch((error) => {
        this.props.changeUser(undefined);
        console.log(error);
      });
  };

  handleClose = () => {
    this.setState({
      photo_upload_show: false,
      photo_upload_error: false,
      photo_upload_success: false,
    });
  };

  render() {
    const { app_version, availableUsers, userList, isPrivate } = this.state;
    return app_version ? (
      <AppBar className="topbar-appBar" position="absolute">
        <Toolbar className="topbar">
          <Typography
            variant="h5"
            component="div"
            sx={{ flexGrow: 0 }}
            color="inherit"
          >
            {this.props.user ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "fit-content",
                  "& svg": {
                    m: 1.5,
                  },
                  "& hr": {
                    mx: 0.5,
                  },
                }}
              >
                <span>{"Hi " + this.props.user.first_name}</span>
                <Autocomplete
                  multiple
                  id="userList"
                  options={availableUsers}
                  value={userList}
                  onChange={this.handleSharingListChange}
                  disabled={isPrivate}
                  onFocus={this.fetchAvailableUsers}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sharing List (Usernames)"
                      variant="standard"
                    />
                  )}
                />
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={this.state.isPrivate}
                      onChange={this.handlePrivateCheckboxChange}
                      sx={{ marginRight: -0.2 }}
                    />
                  )}
                  label="Owner Only"
                />
                <Button
                  className="newbutton"
                  component="label"
                  variant="contained"
                >
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={(domFileRef) => {
                      this.uploadInput = domFileRef;
                    }}
                    onChange={this.handleNewPhoto}
                  />
                </Button>

                <Button
                  className="newbutton"
                  variant="contained"
                  onClick={this.handleLogout}
                >
                  Logout
                </Button>

                <Snackbar
                  anchorOrigin={{ vertical: "top", horizontal: "left" }}
                  open={this.state.photo_upload_show}
                  autoHideDuration={6000}
                  onClose={this.handleClose}
                >
                  {this.state.photo_upload_success ? (
                    <Alert
                      onClose={this.handleClose}
                      severity="success"
                      sx={{ width: "100%" }}
                    >
                      Photo Uploaded
                    </Alert>
                  ) : this.state.photo_upload_error ? (
                    <Alert
                      onClose={this.handleClose}
                      severity="error"
                      sx={{ width: "100%" }}
                    >
                      Error Uploading Photo
                    </Alert>
                  ) : (
                    <div />
                  )}
                </Snackbar>
              </Box>
            ) : (
              "Please Login"
            )}
          </Typography>
          <Typography variant="h6" color="inherit">
            {this.props.page_content}
          </Typography>
          <Typography variant="h6" component="div" color="inherit">
            Version: {this.state.app_version.version}
          </Typography>
        </Toolbar>
      </AppBar>
    ) : (
      <div />
    );
  }
}

export default TopBar;
