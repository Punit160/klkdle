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
            {
                id: 4,
                name: "Daily work",
                path: pages.dailyWork,
                icon: "feather-map",
                dropdownMenu: false,
            },
        ],
    },
    {
        id: "admin",
        state: "Administration",
        items: [
            {
                id: 1,
                name: "User Master",
                path: pages.userMaster,
                icon: "feather-users",
                dropdownMenu: false,
            },
        ],
    },
    {
        id: "portal",
        state: "Portal",
        items: [
            {
                id: 1,
                name: "Roles & Access",
                path: pages.portalAccess,
                icon: "feather-shield",
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
                    { id: 1, name: "ULA Dashboard", path: pages.bihar.ulaDashboard },
                    { id: 2, name: "ULA Form", path: pages.bihar.ulaForm },
                    { id: 3, name: "ULA Data Table", path: pages.bihar.ulaList },
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
            {
                id: 3,
                name: "KUSUM-C AMC",
                path: "#",
                icon: "feather-sun",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.up.kusumcDashboard },
                    { id: 2, name: "Do AMC", path: pages.up.kusumcAmc },
                    { id: 3, name: "View AMC", path: pages.up.kusumcAmcList },
                ],
            },
            {
                id: 4,
                name: "Power Pack AMC",
                path: "#",
                icon: "feather-battery",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.up.powerpackDashboard },
                    { id: 2, name: "Do AMC", path: pages.up.powerpackAmc },
                    { id: 3, name: "View AMC", path: pages.up.powerpackAmcList },
                ],
            },
            {
                id: 5,
                name: "Off Grid AMC",
                path: "#",
                icon: "feather-cloud-off",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.up.offgridDashboard },
                    { id: 2, name: "Do AMC", path: pages.up.offgridAmc },
                    { id: 3, name: "View AMC", path: pages.up.offgridAmcList },
                ],
            },
            {
                id: 6,
                name: "On Grid AMC",
                path: "#",
                icon: "feather-cloud",
                dropdownMenu: [
                    { id: 1, name: "Dashboard", path: pages.up.ongridDashboard },
                    { id: 2, name: "Do AMC", path: pages.up.ongridAmc },
                    { id: 3, name: "View AMC", path: pages.up.ongridAmcList },
                ],
            },
        ],
    },
]
