import { BehaviorSubject } from 'rxjs';
import Api from '../utils/Api';
import { sendAlert } from '../utils/Utility';

export const initialState = {
  searchCriteria: '',
  tableData: {
    data: {
      1: [],
    },
    limit: 10,
    offsetPage: 1,
    totalCount: 0,
  },
  repoDetails: {},
  selectedRepo: {},
  showDetailsDialog: false,
};

let state = Object.assign({}, initialState);
export const subject = new BehaviorSubject(state);

export const apiHost = 'https://api.github.com/';

/*
    Enable/Disable Show Details Dialog
*/
export const setShowDetailsDialog = (showDetailsDialog) => {
  state = {
    ...state,
    showDetailsDialog: showDetailsDialog,
  };
  subject.next(state);
};

/*
    Set Selected Repo
*/
export const setSelectedRepo = (selectedRepo) => {
  state = {
    ...state,
    selectedRepo: selectedRepo,
  };
  subject.next(state);
};

/*
    Set Search Criteria
*/
export const setSearchCriteria = (searchCriteria) => {
  state = {
    ...state,
    searchCriteria: searchCriteria,
  };
  subject.next(state);
};

/*
    Set Table Data Limit
*/
export const setTableDataLimit = (limit) => {
  state = {
    ...state,
    tableData: {
      ...state.tableData,
      limit: limit,
    },
  };
  subject.next(state);
};

/*
    Set Table Data Offset Page
*/
export const setTableDataOffsetPage = (offsetPage) => {
  state = {
    ...state,
    tableData: {
      ...state.tableData,
      offsetPage: offsetPage,
    },
  };
  subject.next(state);
};

/*
    Search and Get Results
    Pass search criteria, limit and offset page along with the default stars sort

    Set the results data against the current offset page along with the total count.
    Make API call only if the results for an offset page is not found or if it is a new search criteria
*/
export const searchAndGet = (searchInput, limit, offsetPage, newSearch = false) => {
  if (newSearch || !(state.tableData.data[offsetPage] && state.tableData.data[offsetPage].length === limit)) {
    if (searchInput !== '') {
      let params = {
        q: searchInput,
        per_page: limit,
        page: offsetPage,
        sort: 'stars',
        order: 'desc',
      };
      let uri = `${apiHost}search/repositories?`;
      Api.getApi(uri, params)
        .then((results) => {
          state = {
            ...state,
            tableData: {
              ...state.tableData,
              data: {
                ...state.tableData.data,
                [offsetPage]: results['items'] || [...initialState.tableData.data],
              },
              totalCount: results['total_count'] || initialState.tableData.totalCount,
            },
          };
          subject.next(state);
        })
        .catch((error) => {
          sendAlert('Unable to get search results - ' + error, 'error');
        });
    } else {
      state = {
        ...state,
        tableData: {
          ...state.tableData,
          data: {
            ...state.tableData.data,
            [offsetPage]: [],
          },
          totalCount: initialState.tableData.totalCount,
        },
      };
      subject.next(state);
    }
  }
};

/*
    Get Recent Fork User Bio.
*/
export const getForkUserBio = (recentFork, selectedRepo, callBack = () => {}) => {
  let params = {};
  let uri = recentFork['owner']['url'] || '';
  Api.getApi(uri, params)
    .then((resultsBio) => {
      let currentRepoDetails = Object.assign({}, state.repoDetails[selectedRepo.id] || {});
      currentRepoDetails['forkUserBio'] = resultsBio;
      state = {
        ...state,
        repoDetails: {
          ...state.repoDetails,
          [selectedRepo.id]: currentRepoDetails,
        },
      };
      subject.next(state);
      callBack();
    })
    .catch((error) => {
      sendAlert('Unable to fetch commit details - ' + error + '. Please retry again.', 'error');
    });
};

/*
    Get Recent Fork.
    Currently pulling only the recent record.
*/
export const getRecentForkDetails = (selectedRepo, callBack = () => {}) => {
  let params = {
    per_page: 1,
    page: 0,
  };
  let uri = (selectedRepo['forks_url'] || '') + '?';
  Api.getApi(uri, params)
    .then((results) => {
      if (results && results.length > 0) {
        const recentFork = results[0];
        let currentRepoDetails = Object.assign({}, state.repoDetails[selectedRepo.id] || {});
        currentRepoDetails['recentFork'] = recentFork;
        state = {
          ...state,
          repoDetails: {
            ...state.repoDetails,
            [selectedRepo.id]: currentRepoDetails,
          },
        };
        subject.next(state);
        callBack(recentFork);
      }
    })
    .catch((error) => {
      sendAlert('Unable to fetch commit details - ' + error + '. Please retry again.', 'error');
    });
};

/*
    Get commits.
    Currently pulling 3 records.
*/
export const getCommitDetails = (selectedRepo, callBack = () => {}) => {
  let params = {
    per_page: 3,
    page: 0,
  };
  let uri = (selectedRepo['commits_url'] || '').replace('{/sha}', '') + '?';
  Api.getApi(uri, params)
    .then((results) => {
      let currentRepoDetails = Object.assign({}, state.repoDetails[selectedRepo.id] || {});
      currentRepoDetails['commits'] = results;
      state = {
        ...state,
        repoDetails: {
          ...state.repoDetails,
          [selectedRepo.id]: currentRepoDetails,
        },
      };
      subject.next(state);
      callBack();
    })
    .catch((error) => {
      sendAlert('Unable to fetch commit details - ' + error + '. Please retry again.', 'error');
    });
};

/*
    Commits, Forks & Fork User Bio API Invocations
    Handle this via callbacks within callbacks.
    This is because of the three API calls (Commits, Forks & Fork User Bio)  that has to be made to Git.

    Once the results are obtained, persist it against the selected repo ID. Make API call next time only if the details are not found
*/
export const getRepoDetails = (selectedRepo) => {
  if (!state.repoDetails[selectedRepo.id]) {
    getCommitDetails(selectedRepo, () => {
      getRecentForkDetails(selectedRepo, (recentFork) => {
        getForkUserBio(recentFork, selectedRepo, () => {
          setShowDetailsDialog(true);
        });
      });
    });
  } else {
    setShowDetailsDialog(true);
  }
};
