// export const menuList = [
//     // {
//     //     id: 0,
//     //     name: "dashboards",
//     //     path: "#",
//     //     icon: 'feather-airplay',
//     //     dropdownMenu: [
//     //         {
//     //             id: 1,
//     //             name: "CRM",
//     //             path: "/",
//     //             subdropdownMenu: false
//     //         },

//     //     ]
//     // },

//     // {
//     //     id: 1,
//     //     name: "Bihar SSL AMC",
//     //     path: "#",
//     //     icon: 'feather-file-text',
//     //     dropdownMenu: [
//     //         {
//     //             id: 1,
//     //             name: "Dashboard",
//     //             path: "Bihar/SSL/Dashboard",
//     //             subdropdownMenu: false
//     //         },
//     //         {
//     //             id: 2,
//     //         name: "Bihar SSL AMC Upload Doc..",
//     //             path: "bihar/ssl-amc/upload-form",
//     //             subdropdownMenu: false
//     //         },
//     //         {
//     //             id: 3,
//     //             name: "Bihar SSL AMC View Doc..",
//     //             path: "bihar/ssl-amc/view-document",
//     //             subdropdownMenu: false
//     //         }
//     //     ]
//     // },




//     {
//         id: 1,
//         name: "Dashboard",
//         path: "bihar/ssl/dashboard",
//         icon: 'feather-airplay',

//         dropdownMenu: false
//     },
//     {
//         id: 2,
//         name: "Bihar SSL AMC Upload Doc..",
//         path: "bihar/ssl-amc/upload-form",
//         icon: 'feather-file-text',
//         dropdownMenu: false
//     },
//     {
//         id: 3,
//         name: "Bihar SSL AMC View Doc..",
//         path: "bihar/ssl-amc/view-document",
//         icon: 'feather-eye',
//         dropdownMenu: false
//     },


//     // ArunchalPradesh 
//         {
//         id: 1,
//         name: "ArunchalPradesh ",
//         path: "#",
//         icon: 'feather-airplay',
//         dropdownMenu: [
//             {
//                 id: 1,
//                 name: "Dashboard",
//                 path: "arunachalpradesh/dashboard",
//                 subdropdownMenu: false
//             },
//             {
//                 id: 2,
//             name: "ArunchalPradesh Upload Doc..",
//                 path: "AP",
//                 subdropdownMenu: false
//             },
//             {
//                 id: 3,
//                 name: "ArunchalPradesh View Doc..",
//                 path: "arunachalpradesh-view-",
//                 subdropdownMenu: false
//             }
//         ]
//     },




// ]




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
                    { id: 1, name: "Dashboard", path: "bihar/ssl/dashboard" },
                    { id: 2, name: "Add Data ", path: "bihar/ssl-amc/upload-form" },
                    { id: 3, name: "View Data", path: "bihar/ssl-amc/view-document" },
                ],
            },
            {
                id: 2,
                name: "AMC",
                path: "#",
                icon: "feather-settings",
                dropdownMenu: [
                    { id: 1, name: "Do AMC", path: "bihar/ssl-amc/light-amc" },
                    { id: 2, name: "View AMC", path: "bihar/ssl-amc/view-light-amc" },
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
        
                 { id: 1, name: "Dashboard", path: "uttarpradesh/ssl-amc/Dashboard" },

                {
                    id: 2,
                    name: "Add Data",
                    path: "uttarpradesh/ssl-amc/upload-form",
                },

            {
                    id: 3,
                    name: "View Data",
                    path: "uttarpradesh/ssl-amc/view-document",
                },
               
            ],
        },
        {
            id: 2,
            name: "AMC",
            path: "#",
            icon: "feather-settings",
            dropdownMenu: [
                { id: 1, name: "Do AMC", path: "uttarpradesh/ssl-amc/light-amc" },
                { id: 2, name: "View AMC", path: "uttarpradesh/ssl-amc/view-light-amc" },
            ],
        },
    ],
},
]