/*!
 * @license
 * Copyright 2017 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { protractor, browser, by, ElementFinder } from 'protractor';

import { APP_ROUTES, BROWSER_WAIT_TIMEOUT, SITE_VISIBILITY, SITE_ROLES, SIDEBAR_LABELS } from '../../configs';
import { LoginPage, LogoutPage, BrowsingPage } from '../../pages/pages';
import { CreateOrEditFolderDialog } from '../../components/dialog/create-edit-folder-dialog';
import { Utils } from '../../utilities/utils';
import { RepoClient, NodeContentTree } from '../../utilities/repo-client/repo-client';

describe('Create folder', () => {
    const username = `user-${Utils.random()}`;

    const parent = `parent-${Utils.random()}`;
    const folderName1 = `folder-${Utils.random()}`;
    const folderName2 = `folder-${Utils.random()}`;
    const folderDescription = 'description of my folder';
    const duplicateFolderName = `folder-${Utils.random()}`;
    const nameWithSpaces = ` folder-${Utils.random()} `;

    const siteName = `site-private-${Utils.random()}`;

    const apis = {
        admin: new RepoClient(),
        user: new RepoClient(username, username)
    };

    const loginPage = new LoginPage();
    const logoutPage = new LogoutPage();
    const personalFilesPage = new BrowsingPage();
    const createDialog = new CreateOrEditFolderDialog();
    const dataTable = personalFilesPage.dataTable;

    function openCreateDialog(): any {
        return personalFilesPage.sidenav
            .openNewMenu()
            .then((menu) => {
                menu.clickMenuItem('Create folder');
            })
            .then(() => createDialog.waitForDialogToOpen());
    }

    beforeAll(done => {
        apis.admin.people.createUser(username)
            .then(() => apis.admin.sites.createSite(siteName, SITE_VISIBILITY.PRIVATE))
            .then(() => apis.admin.nodes.createFolders([ folderName1 ], `Sites/${siteName}/documentLibrary`))
            .then(() => apis.admin.sites.addSiteMember(siteName, username, SITE_ROLES.SITE_CONSUMER))
            .then(() => apis.user.nodes.createFolders([ duplicateFolderName ], parent))
            .then(() => loginPage.load()
                .then(() => loginPage.loginWith(username))
                .then(done));
    });

    beforeEach(done => {
        personalFilesPage.sidenav.navigateToLinkByLabel(SIDEBAR_LABELS.PERSONAL_FILES)
            .then(() => dataTable.waitForHeader())
            .then(done);
    });

    afterEach(done => {
        browser.actions().sendKeys(protractor.Key.ESCAPE).perform().then(done);
    });

    afterAll(done => {
        Promise
            .all([
                apis.admin.sites.deleteSite(siteName),
                apis.user.nodes.deleteNodes([ parent ]),
                logoutPage.load()
            ])
            .then(done);
    });

    it('option is enabled when having enough permissions', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => personalFilesPage.sidenav.openNewMenu()
                .then((menu) => {
                    const menuItem = menu.getItemByLabel('Create folder');
                    expect(menuItem.isEnabled()).toBe(true, 'Create folder is not enabled');
                })
            );
    });

    it('creates new folder with name', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => createDialog.enterName(folderName1).clickCreate())
                .then(() => createDialog.waitForDialogToClose())
                .then(() => dataTable.waitForHeader())
                .then(() => {
                    const row = dataTable.getRowByContainingText(folderName1);
                    expect(row.isPresent()).toBe(true, 'Folder not displayed in list view');
                })
            );
    });

    it('creates new folder with name and description', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => {
                    createDialog
                        .enterName(folderName2)
                        .enterDescription(folderDescription)
                        .clickCreate();
                })
                .then(() => createDialog.waitForDialogToClose())
                .then(() => dataTable.waitForHeader())
                .then(() => {
                    const row = dataTable.getRowByContainingText(folderName2);
                    expect(row.isPresent()).toBe(true, 'Folder not displayed in list view');
                })
                .then(() => {
                    apis.user.nodes.getNodeDescription(folderName2)
                        .then((description) => expect(description).toEqual(folderDescription));
                })
            );
    });

    it('enabled option tooltip', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => personalFilesPage.sidenav.openNewMenu()
                .then(menu => {
                    browser.actions().mouseMove(menu.getItemByLabel('Create folder')).perform();
                    return menu;
                })
                .then((menu) => {
                    expect(menu.getItemTooltip('Create folder')).toContain('Create new folder');
                })
            );
    });

    it('option is disabled when not enough permissions', () => {
        const fileLibrariesPage = new BrowsingPage();

        fileLibrariesPage.sidenav.navigateToLinkByLabel(SIDEBAR_LABELS.FILE_LIBRARIES)
            .then(() => fileLibrariesPage.dataTable.doubleClickOnRowByContainingText(siteName))
            .then(() => fileLibrariesPage.dataTable.doubleClickOnRowByContainingText(folderName1))
            .then(() => fileLibrariesPage.sidenav.openNewMenu())
            .then(menu => {
                const menuItem = menu.getItemByLabel('Create folder');
                expect(menuItem.isEnabled()).toBe(false, 'Create folder is not disabled');
            });
    });

    it('disabled option tooltip', () => {
        const fileLibrariesPage = new BrowsingPage();

        fileLibrariesPage.sidenav.navigateToLinkByLabel(SIDEBAR_LABELS.FILE_LIBRARIES)
            .then(() => fileLibrariesPage.dataTable.doubleClickOnRowByContainingText(siteName))
            .then(() => fileLibrariesPage.dataTable.doubleClickOnRowByContainingText(folderName1))
            .then(() => fileLibrariesPage.sidenav.openNewMenu())
            .then(menu => {
                browser.actions().mouseMove(menu.getItemByLabel('Create folder')).perform()
                    .then(() => {
                        expect(menu.getItemTooltip('Create folder')).toContain(`You can't create a folder here`);
                    });
            });
    });

    it('dialog UI elements', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog().then(() => {
                const folderName = createDialog.nameInput;
                const description = createDialog.descriptionTextArea;
                const createButton = createDialog.createButton;
                const cancelButton = createDialog.cancelButton;

                expect(createDialog.getTitle()).toBe('Create new folder');
                expect(folderName.isDisplayed()).toBe(true, 'Name input is not displayed');
                expect(description.isDisplayed()).toBe(true, 'Description field is not displayed');
                expect(createButton.isEnabled()).toBe(false, 'Create button is not disabled');
                expect(cancelButton.isEnabled()).toBe(true, 'Cancel button is not enabled');
            })
        );
    });

    it('with empty folder name', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => {
                    createDialog.deleteNameWithBackspace();
                })
                .then(() => {
                    const createButton = createDialog.createButton;

                    expect(createButton.isEnabled()).toBe(false, 'Create button is enabled');
                    expect(createDialog.getValidationMessage()).toMatch('Folder name is required');
                })
            );
    });

    it('with folder name ending with a dot "."', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => createDialog.enterName('folder-name.'))
                .then((dialog) => {
                    const createButton = dialog.createButton;

                    expect(createButton.isEnabled()).toBe(false, 'Create button is not disabled');
                    expect(dialog.getValidationMessage()).toMatch(`Folder name can't end with a period .`);
                })
            );
    });

    it('with folder name containing special characters', () => {
        const namesWithSpecialChars = [ 'a*a', 'a"a', 'a<a', 'a>a', `a\\a`, 'a/a', 'a?a', 'a:a', 'a|a' ];

        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => {
                    namesWithSpecialChars.forEach(name => {
                        createDialog.enterName(name);

                        const createButton = createDialog.createButton;

                        expect(createButton.isEnabled()).toBe(false, 'Create button is not disabled');
                        expect(createDialog.getValidationMessage()).toContain(`Folder name can't contain these characters`);
                    });
                })
            );
    });

    it('with folder name containing only spaces', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => createDialog.enterName('    '))
                .then((dialog) => {
                    const createButton = dialog.createButton;

                    expect(createButton.isEnabled()).toBe(false, 'Create button is not disabled');
                    expect(dialog.getValidationMessage()).toMatch(`Folder name can't contain only spaces`);
                })
            );
    });

    it('cancel folder creation', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => {
                    createDialog
                        .enterName('test')
                        .enterDescription('test description')
                        .clickCancel();
                })
                .then(() => expect(createDialog.component.isPresent()).not.toBe(true, 'dialog is not closed'))
            );
    });

    it('duplicate folder name', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => createDialog.enterName(duplicateFolderName).clickCreate())
                .then(() => {
                    personalFilesPage.getSnackBarMessage()
                        .then(message => {
                            expect(message).toEqual(`There's already a folder with this name. Try a different name.`);
                            expect(createDialog.component.isPresent()).toBe(true, 'dialog is not present');
                        });
                })
            );
    });

    it('trim ending spaces from folder name', () => {
        personalFilesPage.dataTable.doubleClickOnRowByContainingText(parent)
            .then(() => openCreateDialog()
                .then(() => createDialog.enterName(nameWithSpaces).clickCreate())
                .then(() => createDialog.waitForDialogToClose())
                .then(() => dataTable.waitForHeader())
                .then(() => {
                    const row = dataTable.getRowByContainingText(nameWithSpaces.trim());
                    expect(row.isPresent()).toBe(true, 'Folder not displayed in list view');
                })
            );
    });
});
