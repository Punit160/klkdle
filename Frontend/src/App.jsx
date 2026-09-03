import { RouterProvider } from 'react-router-dom'
import { router } from './route/router'
import 'react-quill/dist/quill.snow.css';
import 'react-circular-progressbar/dist/styles.css';
import "react-perfect-scrollbar/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-datetime/css/react-datetime.css";
import NavigationProvider from './contentApi/navigationProvider';
import SideBarToggleProvider from './contentApi/sideBarToggleProvider';
import SearchProvider from './contentApi/searchProvider';

const App = () => {
  return (
    <>
      <NavigationProvider>
        <SideBarToggleProvider>
          <SearchProvider>
            <RouterProvider router={router} />
          </SearchProvider>
        </SideBarToggleProvider>
      </NavigationProvider>
    </>
  )
}

export default App

