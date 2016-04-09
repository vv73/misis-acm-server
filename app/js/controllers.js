'use strict';

/* Controllers */

angular.module('Qemy.controllers', [
    'Qemy.i18n'
])
    .controller('PageCtrl', ['$scope', '_', function($scope, _) {
        var defaultTitle = _('app_name');
        $scope.$on('change_title', function(e, args) {
            $scope.title = args.title !== undefined && args.title.length ? args.title : defaultTitle;
        });
    }])

    .controller('AppCtrl', ['$scope', '$rootScope', 'UserManager', '$state', function($scope, $rootScope, UserManager, $state) {
        function updateUserData() {
            console.log('User data updating...');
            $rootScope.$broadcast('data loading');
            var userPromise = UserManager.getCurrentUser({ cache: false });
            userPromise.then(function (user) {
                $rootScope.$broadcast('data loaded');
                if (!user || !user.id) {
                    $rootScope.$broadcast('user updated', { user: {} });
                    return $state.go('auth.form');
                }
                $rootScope.$broadcast('user updated', { user: user });
                console.log('User data updated.');
            }).catch(function (err) {
                $state.go('auth.form');
            });
        }
        updateUserData();

        $scope.$on('user update needed', function (ev, args) {
            console.log('User data update needed.');
            updateUserData();
        });
    }])

    .controller('IndexCtrl', ['$scope', '_', '$state', '$rootScope', 'UserManager',
        function($scope, _, $state, $rootScope, UserManager) {
            $scope.$emit('change_title', {
                title: _('app_name')
            });

            $scope.$emit('user update needed');
            $scope.$on('user updated', function (ev, args) {
                if (!args.user) {
                    return;
                }
                $state.go('contests.list');
            });
        }
    ])

    .controller('HeaderCtrl', ['$scope', '$rootScope', '$state', 'UserManager', '$mdDialog',
        function ($scope, $rootScope, $state, UserManager, $mdDialog) {
            $scope.user = {};
            $scope.isAuth = false;
            $scope.$on('user updated', function (ev, args) {
                if (!args.user) {
                    return;
                }
                $scope.user = args.user;
                $scope.isAuth = !!args.user.id;
            });

            $scope.menuList = [{
                type: 'item',
                id: 'settings',
                name: 'Настройки',
                iconSrc: '/img/icons/ic_settings_48px.svg'
            }, {
                type: 'item',
                onlyFor: 5,
                id: 'admin-panel',
                name: 'Панель администратора',
                iconSrc: '/img/icons/ic_security_48px.svg'
            }, {
                type: 'divider'
            }, {
                type: 'item',
                id: 'exit-app',
                name: 'Выход',
                iconSrc: '/img/icons/ic_exit_to_app_48px.svg'
            }];

            $scope.profileItemClick = function (event, item, index) {
                switch (item.id) {
                    case 'settings':
                        break;
                    case 'admin-panel':
                        $state.go('admin.index');
                        break;
                    case 'exit-app':
                        exitFromApp(event);
                        break;
                }
            };

            function exitFromApp(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Предупреждение')
                    .content('Вы действительно хотите выйти?')
                    .clickOutsideToClose(true)
                    .ariaLabel('Lucky day')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent(ev);
                $mdDialog.show(confirm).then(function() {
                    UserManager.logout().then(function (result) {
                        $scope.$emit('user update needed');
                    });
                });
            }

            $scope.headerMenu = {};
            $scope.$on('header expand open', function (ev, args) {
                var contest = args.contest;
                $scope.headerMenu = {
                    contest: contest
                };
            });

            $scope.$on('header expand close', function (ev, args) {
                $scope.headerMenu.contest = null;
                $scope.headerMenu = {};
            });

            $scope.logoClick = function (ev) {
                if ($state.current
                    && $state.current.name
                    && $state.current.name === 'contests.list') {
                    $rootScope.$broadcast('contests list update needed')
                }
            };
        }
    ])

    .controller('WrapperCtrl', ['$scope', '$rootScope', '$timeout', '$interval', function ($scope, $rootScope, $timeout, $interval) {

        $scope.pageLoading = false;
        $scope.$on('data loading', function (ev, args) {
            $scope.pageLoading = true;
        });

        $scope.$on('data loaded', function (ev, args) {
            $scope.pageLoading = false;
        });
    }])
;