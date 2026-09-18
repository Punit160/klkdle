import { pages } from "../../../api/routes"

export const menuList = [
    {
        id: "account",
        state: "My Account",
        items: [
            {
                id: 1,
                name: "Dashboard",
                path: pages.dashboard,
                icon: "feather-airplay",
                dropdownMenu: false,
            },
            {
                id: 2,
                name: "Profile",
                path: pages.profile,
                icon: "feather-user",
                dropdownMenu: false,
            },
            {
                id: 3,
                name: "Attendance",
                path: pages.attendance,
                icon: "feather-clock",
                dropdownMenu: false,
            },
        ],
    },
    {
        id: "bihar",
        state: "Bihar",
        items: [
            {
                id: 0,
                name: "SSL AMC Dashboard",
                path: pages.bihar.amcDashboard,
                icon: "feather-airplay",
                dropdownMenu: false,
            },
            {
                id: 4,
                name: "Assign AMC",
                path: pages.bihar.assignAmc,
                icon: "feather-list",
                dropdownMenu: false,
            },
            {
                id: 1,
                name: "AMC documentation",
                path: "#",
                icon: "feather-file-text",
                dropdownMenu: [
                    { id: 1, name: "Add Data ", path: pages.bihar.amcUpload },
                    { id: 2, name: "View Data", path: pages.bihar.amcList },
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
            {
                id: 5,
                name: "Bihar ULA",
                path: "#",
                icon: "feather-sun",
                dropdownMenu: [
                    { id: 1, name: "ULA Form", path: pages.bihar.ulaForm },
                    { id: 2, name: "ULA Data Table", path: pages.bihar.ulaList },
                ],
            },
        ],
    },
    {
        id: "up",
        state: "Uttar Pradesh",
        items: [
            {
                id: 0,
                name: "SSL AMC Dashboard",
                path: pages.up.amcDashboard,
                icon: "feather-airplay",
                dropdownMenu: false,
            },
            {
                id: 1,
                name: "AMC documentation",
                path: "#",
                icon: "feather-file-text",
                dropdownMenu: [
                    { id: 1, name: "Add Data", path: pages.up.amcUpload },
                    { id: 2, name: "View Data", path: pages.up.amcList },
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
