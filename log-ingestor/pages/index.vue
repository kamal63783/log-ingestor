<template>
  <div class="logs">
    <div v-if="showLoadingScreen" class="loading-screen">
      <div class="loading-dots">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    <h1 class="page-title">Log Ingestor</h1>
    <div class="button-container">
      <button
        v-if="!showLoadingScreen && loggedIn && connectedToDB && isAdmin"
        class="db-switch-button"
        @click="switchDBDetails"
      >
        Switch Database
      </button>
      <button
        v-if="!showLoadingScreen && loggedIn && connectedToDB"
        class="db-switch-button logout"
        @click="logout"
      >
        Logout
      </button>
    </div>
    <div
      v-if="!showLoadingScreen && !loggedIn && !connectedToDB"
      class="login-container"
    >
      <h2 class="container-title">Login</h2>
      <form @submit.prevent="login">
        <div class="input-group">
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Username"
          />
        </div>
        <div class="input-group">
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Password"
          />
        </div>
        <button type="submit" class="input-btn">Login</button>
        <div class="error-message-container">
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </form>
    </div>

    <!-- MongoDB Connection Form -->
    <div
      v-if="!showLoadingScreen && loggedIn && !connectedToDB"
      class="login-container"
    >
      <h2 class="container-title">MongoDB Connection</h2>
      <form @submit.prevent="setConfiguration">
        <div class="config-inputs">
          <input
            v-model="dbURL"
            type="text"
            placeholder="MongoDB URL"
            class="input-group"
          />
          <input
            v-model="dbName"
            type="text"
            placeholder="Database Name"
            class="input-group"
          />
          <input
            v-model="collectionName"
            type="text"
            placeholder="Collection Name"
            class="input-group"
          />
          <button type="submit" class="input-btn" @click="setConfiguration">
            Set Configuration
          </button>
          <div class="error-message-container">
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
      </form>
    </div>

    <div v-if="!showLoadingScreen && loggedIn && connectedToDB">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search logs..."
        class="search-bar"
        @input="performSearch"
      />
      <div class="filter-container">
        <div
          v-for="(filter, index) in selectedFilters"
          :key="index"
          class="filter-item"
        >
          <select
            v-model="filter.type"
            class="filter-select"
            @change="applyFilters"
          >
            <option disabled value="">Select Filter</option>
            <option value="level">Level</option>
            <option value="message">Message</option>
            <option value="resourceId">Resource ID</option>
            <option value="timestamp">Timestamp</option>
            <option value="traceId">Trace ID</option>
            <option value="spanId">Span ID</option>
            <option value="commit">Commit</option>
            <option value="metadata.parentResourceId">
              Parent Resource ID
            </option>
          </select>
          <input
            v-if="filter.type === 'timestamp'"
            v-model="filter.startTimestamp"
            type="datetime-local"
            class="filter-input"
            @input="applyFilters"
          />
          <input
            v-if="filter.type === 'timestamp'"
            v-model="filter.endTimestamp"
            type="datetime-local"
            class="filter-input"
            @input="applyFilters"
          />
          <input
            v-if="filter.type !== 'timestamp'"
            v-model="filter.searchValue"
            placeholder="Enter value..."
            class="filter-input"
            @input="applyFilters"
          />
          <button class="filter-remove-btn" @click="removeFilter(index)">
            Remove
          </button>
        </div>
      </div>
      <button class="add-filter-btn" @click="addFilter">Add Filter</button>

      <div v-if="logs.length > 0" class="logs-table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th v-for="(value, key) in filteredLogs[0]" :key="key">
                {{ formatHeader(key) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in paginatedLogs" :key="index">
              <td>{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td v-for="(value, key) in log" :key="key">{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="error-message-container">
        <p
          v-if="filteredLogs.length === 0 && paginatedLogs.length === 0"
          class="error-message"
        >
          No results
        </p>
        <p
          v-else-if="filteredLogs.length > 0 && paginatedLogs.length === 0"
          class="error-message"
        >
          Please navigate back to first page
        </p>
      </div>
      <!-- Pagination controls -->
      <div class="pagination">
        <button
          :disabled="currentPage === 1 || totalPages === 0"
          @click="firstPage"
        >
          First
        </button>
        <button
          :disabled="currentPage === 1 || totalPages === 0"
          @click="prevPage"
        >
          Previous
        </button>
        <span>{{ getLogsRange() }}</span>
        <button
          :disabled="currentPage === totalPages || totalPages === 0"
          @click="nextPage"
        >
          Next
        </button>
        <button
          :disabled="currentPage === totalPages || totalPages === 0"
          @click="lastPage"
        >
          Last
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showLoadingScreen: false,
      username: '',
      password: '',
      loggedIn: false,
      isAdmin: false,
      dbURL: '',
      dbName: '',
      collectionName: '',
      connectedToDB: false,
      errorMessage: '',
      searchQuery: '',
      logs: [],
      currentPage: 1,
      prevPageBeforeSearch: 1,
      itemsPerPage: 50,
      selectedFilters: [
        { type: '', searchValue: '', startTimestamp: '', endTimestamp: '' },
      ],
    }
  },

  computed: {
    filteredLogs() {
      const logs = this.applyFilters()
      if (!Array.isArray(logs)) {
        return []
      }
      return logs
    },

    paginatedLogs() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage
      const endIndex = this.currentPage * this.itemsPerPage
      return this.filteredLogs.slice(startIndex, endIndex)
    },

    totalPages() {
      return Math.ceil(this.filteredLogs.length / this.itemsPerPage)
    },
  },

  mounted() {
    document.title = 'Log Ingestor'
    this.showLoadingScreen = true

    setTimeout(() => {
      this.showLoadingScreen = false
    }, 3000)

    const socket = new WebSocket('ws://localhost:3000')

    socket.onmessage = (event) => {
      const newLog = JSON.parse(event.data)
      this.updateLog(newLog)
    }

    socket.onerror = (error) => {
      this.errorMessage = 'WebSocket error: ' + error.message
    }

    socket.onclose = () => {
      this.errorMessage = 'WebSocket connection closed'
    }

    this.checkAdminStatus()
    if (this.dbURL && this.dbName && this.collectionName) {
      this.fetchLogs()
    }

    this.adjustColumnWidths()
    window.addEventListener('resize', this.adjustColumnWidths)
  },

  destroyed() {
    window.removeEventListener('resize', this.adjustColumnWidths)
  },

  methods: {
    simulateDelay(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    },

    async login() {
      try {
        this.showLoadingScreen = true
        await this.simulateDelay(3000)
        if (this.username.trim() !== '' && this.password.trim() !== '') {
          if (this.username.trim() === 'admin') {
            this.isAdmin = true
            this.errorMessage = ''
            this.loggedIn = true
            this.checkForDBConfig()
          } else if (!this.connectedToDB && !this.isAdmin) {
            this.errorMessage =
              'Database is not connected. Please contact admin'
          } else {
            this.loggedIn = true
            this.connectedToDB = true
            this.checkAdminStatus()
            this.fetchLogs()
          }
        } else {
          this.errorMessage = 'Please enter username and password!'
        }
        this.showLoadingScreen = false
      } catch (error) {
        this.showLoadingScreen = false
      }
    },

    checkAdminStatus() {
      if (this.username.trim() === 'admin') {
        this.isAdmin = true
        this.connectedToDB = true
        this.fetchLogs()
      } else {
        this.isAdmin = false
      }
    },

    checkForDBConfig() {
      if (!this.dbURL || !this.dbName || !this.collectionName) {
        this.connectedToDB = false
      } else {
        this.connectedToDB = true
        this.fetchLogs()
      }
    },

    async setConfiguration() {
      try {
        this.showLoadingScreen = true
        await this.simulateDelay(3000)
        if (this.dbURL && this.dbName && this.collectionName) {
          try {
            const configData = {
              mongoURL: this.dbURL,
              dbName: this.dbName,
              collectionName: this.collectionName,
            }

            const response = await this.$axios.$post('/set-config', configData)

            if (response.connected) {
              this.errorMessage = ''
              this.connectedToDB = true
              this.fetchLogs()
            } else {
              this.connectedToDB = false
              this.errorMessage = 'Database connection failed.'
            }
          } catch (error) {
            this.connectedToDB = false
            if (
              error.response &&
              error.response.data &&
              typeof error.response.data === 'string' &&
              error.response.data.includes('MongoParseError')
            ) {
              this.errorMessage =
                'Invalid MongoDB connection string. Please check the entered details.'
            } else {
              this.errorMessage =
                'Error setting configuration: ' + error.message
            }
          }
        } else {
          this.errorMessage = 'Please fill in all fields.'
        }
        this.showLoadingScreen = false
      } catch (error) {
        this.showLoadingScreen = false
      }
    },

    async fetchLogs() {
      try {
        const response = await this.$axios.$get('/logs')
        this.logs = response || []
      } catch (error) {
        this.errorMessage = 'Error fetching logs'
      }
    },

    async switchDBDetails() {
      try {
        this.showLoadingScreen = true
        await this.simulateDelay(3000)
        this.connectedToDB = !this.connectedToDB
        this.showLoadingScreen = false
      } catch (error) {
        this.showLoadingScreen = false
      }
    },

    async logout() {
      try {
        this.showLoadingScreen = true
        await this.simulateDelay(3000)
        this.username = ''
        this.password = ''
        this.loggedIn = false
        this.connectedToDB = false
        this.showLoadingScreen = false
      } catch (error) {
        this.showLoadingScreen = false
      }
    },

    performSearch() {
      let logsToFilter = this.logs || []
      if (this.selectedFilters.some((filter) => filter.type !== '')) {
        logsToFilter = this.applyFilters()
      }

      if (this.searchQuery.trim() !== '') {
        const query = this.searchQuery.trim()
        const regex = new RegExp(query, 'i')

        return logsToFilter.filter((log) => {
          for (const value of Object.values(log)) {
            if (typeof value === 'string' && regex.test(value)) {
              return true
            }
          }
          return false
        })
      } else {
        return logsToFilter
      }
    },

    applyFilters() {
      let logs = this.logs || []

      for (const filter of this.selectedFilters) {
        if (filter.type !== '') {
          if (
            filter.type === 'timestamp' &&
            filter.startTimestamp &&
            filter.endTimestamp
          ) {
            const startTimestamp = new Date(filter.startTimestamp).getTime()
            const endTimestamp = new Date(filter.endTimestamp).getTime()
            logs = logs.filter((log) => {
              const logTimestamp = new Date(log.timestamp).getTime()
              return (
                logTimestamp >= startTimestamp && logTimestamp <= endTimestamp
              )
            })
          } else if (
            filter.type === 'metadata.parentResourceId' &&
            filter.searchValue.trim() !== ''
          ) {
            logs = logs.filter((log) =>
              String(log.metadata?.parentResourceId)
                .toLowerCase()
                .includes(filter.searchValue.toLowerCase())
            )
          } else if (filter.searchValue.trim() !== '') {
            const query = filter.searchValue.trim()
            const regex = new RegExp(query, 'i')

            logs = logs.filter((log) => {
              const value = log[filter.type]
              if (typeof value === 'string' && regex.test(value)) {
                return true
              }
              return false
            })
          }
        }
      }

      if (this.searchQuery.trim() !== '') {
        const query = this.searchQuery.trim()
        const regex = new RegExp(query, 'i')

        logs = logs.filter((log) => {
          for (const value of Object.values(log)) {
            if (typeof value === 'string' && regex.test(value)) {
              return true
            }
          }
          return false
        })
      }

      return logs
    },

    addFilter() {
      const searchResults = this.applyFilters()
      if (searchResults.length > 0) {
        if (this.currentPage !== 1) {
          this.prevPageBeforeSearch = this.currentPage
        }
        this.currentPage = 1
      } else if (this.prevPageBeforeSearch !== 1) {
        this.currentPage = this.prevPageBeforeSearch
      }
      this.selectedFilters.push({
        type: '',
        searchValue: '',
        startTimestamp: '',
        endTimestamp: '',
      })
    },

    removeFilter(index) {
      this.selectedFilters.splice(index, 1)
      if (
        this.selectedFilters.length === 1 &&
        this.prevPageBeforeSearch !== 1
      ) {
        this.currentPage = this.prevPageBeforeSearch
      } else if (
        this.selectedFilters.length === 1 &&
        this.prevPageBeforeSearch === 1
      ) {
        this.currentPage = 1
      }
    },

    formatHeader(key) {
      if (typeof key !== 'string') {
        key = String(key)
      }

      const titleCaseKey = key
        .split(/(?=[A-Z])/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      const words = titleCaseKey.split(' ')
      const lastWord = words.pop()
      const formattedLastWord =
        lastWord.charAt(0).toUpperCase() + lastWord.slice(1)
      words.push(formattedLastWord)
      return words.join(' ')
    },

    adjustColumnWidths() {
      const table = this.$refs.logsTable
      const container = this.$refs.tableContainer

      if (!table || !container) return

      const headerCells = Array.from(table.querySelectorAll('th'))
      const dataCells = Array.from(table.querySelectorAll('td'))

      const allCells = headerCells.concat(dataCells)

      allCells.forEach((cell) => {
        cell.style.width = 'auto'
      })

      const maxWidths = headerCells.map((headerCell, index) => {
        const headerWidth = headerCell.getBoundingClientRect().width
        const dataWidths = dataCells
          .filter((_, dataIndex) => dataIndex % headerCells.length === index)
          .map((dataCell) => dataCell.getBoundingClientRect().width)

        const maxDataWidth = Math.max(headerWidth, ...dataWidths)
        return maxDataWidth
      })

      headerCells.forEach((cell, index) => {
        cell.style.width = `${maxWidths[index]}px`
      })

      dataCells.forEach((cell, index) => {
        cell.style.width = `${maxWidths[index % headerCells.length]}px`
      })

      const tableWidth = maxWidths.reduce((acc, width) => acc + width, 0)
      container.style.width = `${tableWidth}px`
    },

    getLogsRange() {
      let startIndex = 0
      let endIndex = 0

      if (this.searchQuery.trim() !== '') {
        startIndex = 1
        endIndex = this.filteredLogs.length
      } else if (this.filteredLogs.length > 0) {
        startIndex = (this.currentPage - 1) * this.itemsPerPage + 1
        endIndex = this.currentPage * this.itemsPerPage
        if (endIndex > this.filteredLogs.length) {
          endIndex = this.filteredLogs.length
        }
      }

      return `${startIndex}-${endIndex} / ${this.filteredLogs.length}`
    },

    updateLog(newLog) {
      const existingLogIndex = this.logs.findIndex(
        (log) => log.id === newLog.id
      )
      if (existingLogIndex !== -1) {
        this.$set(this.logs, existingLogIndex, newLog)
      } else {
        this.logs.push(newLog)
      }
      this.fetchLogs()
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },

    firstPage() {
      if (this.currentPage > 1) {
        this.currentPage = 1
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },

    lastPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage = this.totalPages
      }
    },
  },
}
</script>

<style scoped>
.logs {
  font-family: Arial, sans-serif;
  padding: 20px;
  background: linear-gradient(135deg, #6a82fb 0%, #a78bfa 100%);
  color: #333;
  min-height: 795px;
  position: relative;
}
.loading-screen {
  height: 100vh;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-dots {
  display: flex;
}

.loading-dots div {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #3498db;
  margin: 0 5px;
  opacity: 0;
  animation: bounce 1s infinite;
}

.loading-dots div:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots div:nth-child(2) {
  animation-delay: 0.1s;
}

.loading-dots div:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-15px);
  }
  100% {
    opacity: 0;
    transform: translateY(0);
  }
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 20px;
  text-align: center;
  color: #fff;
  font-weight: bold;
}

.button-container {
  position: absolute;
  top: 20px; /* Adjust top position */
  right: 20px; /* Adjust right position */
}

.db-switch-button {
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
}

.db-switch-button.logout {
  margin-left: 0;
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  color: #333;
  overflow: hidden;
  position: relative;
}

.container-title {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  align-items: center;
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 15px;
}

.input-group input,
.config-inputs input {
  padding: 10px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}

.input-btn {
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 20px;
  justify-content: center;
  align-items: center;
}

.error-message-container {
  width: 300px;
  height: auto;
  text-align: center;
  overflow: hidden;
}

.error-message {
  font-weight: bold;
  color: #f44336;
  margin-top: 20px;
  font-size: 16px;
}

input {
  padding: 8px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}

button {
  padding: 10px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  align-items: center;
  justify-content: center;
}

button:hover {
  background-color: #45a049;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.search-bar {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 500px;
}
.filter-container {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  margin-bottom: 10px;
}
.filter-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.filter-item:last-child {
  margin-bottom: 10px;
  margin-right: 0;
}

.filter-select,
.filter-input,
.filter-remove-btn,
.add-filter-btn {
  width: 150px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px;
  font-size: 14px;
  flex-shrink: 0;
}

.filter-input {
  width: 200px;
}

.add-filter-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  cursor: pointer;
  margin-top: -17.5px;
}

.filter-remove-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  cursor: pointer;
}

.filter-remove-btn:hover,
.add-filter-btn:hover {
  background-color: #45a049;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.logs-table-container {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: auto;
  border: 2px solid #fff;
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  font-weight: 400;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  font-weight: bold;
  background-color: #428bca;
}

th::last-word::first-letter {
  text-transform: uppercase;
}

tr:hover {
  background-color: #fff;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.pagination button,
.pagination span {
  padding: 8px 12px;
  margin: 0 4px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  text-decoration: none;
}

.pagination button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
