import { pages } from "../../../api/routes"

export const menuList = [
    {
        id: "bihar",
        state: "Bihar",
        items: [
            {
                id: 1,
                name: "AMC documentation",
                path: "#",
                icon: "feather-airplay",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.bihar.amcDashboard },
                    { id: 2, name: "Add Data ", path: pages.bihar.amcUpload },
                    { id: 3, name: "View Data", path: pages.bihar.amcList },
                ],
            },
            {
                id: 2,
                name: "AMC",
                path: "#",
                icon: "feather-settings",
                dropdownMenu: [
                    { id: 1, name: "Do AMC", path: pages.bihar.lightAmc },
                    { id: 2, name: "View AMC", path: pages.bihar.lightAmcList },
                ],
            },
        ],
    },

    {
        id: "uttar-pradesh",
        state: "Uttar Pradesh",
        items: [
            {
                id: 1,
                name: "AMC documentation",
                path: "#",
                icon: "feather-sunrise",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.up.amcDashboard },
                    { id: 2, name: "Add Data", path: pages.up.amcUpload },
                    { id: 3, name: "View Data", path: pages.up.amcList },
                ],
            },
            {
                id: 2,
                name: "AMC",
                path: "#",
                icon: "feather-settings",
                dropdownMenu: [
                    { id: 1, name: "Do AMC", path: pages.up.lightAmc },
                    { id: 2, name: "View AMC", path: pages.up.lightAmcList },
                ],
            },
        ],
    },
]
