// This is an extremely basic shell argument parser.
function splitCommandLine(input) {
  // Get rid of \r\n newlines. They won't matter for our purposes.
  input = input.replaceAll('\r', '')

  // The following states are possible:
  const UNQUOTED = 0
  const UNQUOTED_BACKSLASH = 1
  const SINGLE_QUOTED = 2
  const DOUBLE_QUOTED = 3
  const DOUBLE_QUOTED_BACKSLASH = 4
  let state = UNQUOTED

  const args = []
  let arg = ''

  for (let i = 0; i < input.length; i++) {
    const c = input.charAt(i)
    switch (state) {
      case UNQUOTED:
        if (c === '\\') {
          state = UNQUOTED_BACKSLASH
        } else if (c === ' ' || c === '\n' || c === '\t') {
          if (arg.length) {
            args.push(arg)
            arg = ''
          }
        } else if (c === "'") {
          state = SINGLE_QUOTED
        } else if (c === '"') {
          state = DOUBLE_QUOTED
        } else {
          arg += c
        }
        break
      case UNQUOTED_BACKSLASH:
        if (c !== '\n') {
          arg += c
        }
        state = UNQUOTED
        break
      case SINGLE_QUOTED:
        if (c === "'") {
          state = UNQUOTED
        } else {
          arg += c
        }
        break
      case DOUBLE_QUOTED:
        if (c === '\\') {
          state = DOUBLE_QUOTED_BACKSLASH
        } else if (c === '"') {
          state = UNQUOTED
        } else {
          arg += c
        }
        break
      case DOUBLE_QUOTED_BACKSLASH:
        if (c === '$' || c === '`' || c === '"' || c === '\\') {
          arg += c
        } else if (c !== '\n') {
          arg += '\\' + c
        }
        state = DOUBLE_QUOTED
        break
    }
  }
  if (arg.length) {
    args.push(arg)
  }
  return args
}

function extractSwitches(args) {
  const switches = {}
  for (let arg of args) {
    const match = arg.match(/^--([^=]+)=?(.*)$/)
    if (match) {
      switches[match[1]] = match[2]
    }
  }
  return switches
}

function buildTrials(switches) {
  let trials = {}

  const forceFieldTrials = switches['force-fieldtrials'] ?? ''
  for (let [_, activationMarker, trial, group] of forceFieldTrials.matchAll(
    /(\*)?([^/]+)\/([^/]+)\/?/g
  )) {
    trials[trial] = {
      group,
      active: !!activationMarker,
      features: {},
      params: {}
    }
  }

  const forceFieldTrialParams = switches['force-fieldtrial-params'] ?? ''
  for (let groupInfo of forceFieldTrialParams.split(',')) {
    const match = groupInfo.match(/^\s*([^.:]+).([^.:]+):([^:]+)\s*$/)
    if (!match) {
      continue
    }
    let [_, trial, group, params] = match
    trial = decodeURIComponent(trial)
    group = decodeURIComponent(group)
    if (!trials.hasOwnProperty(trial) || trials[trial].group !== group) {
      continue
    }
    for (let [_, key, value] of params.matchAll(/([^/]+)\/([^/]+)\/?/g)) {
      key = decodeURIComponent(key)
      value = decodeURIComponent(value)
      trials[trial].params[key] = value
    }
  }

  // The general format is: Feature<Study.Group:Params
  // Full support for feature params and group name are omitted here, because
  // chrome://variations/?show-variations-cmd does not emit them.
  const enableFeatures = switches['enable-features'] ?? ''
  for (let [_, defaultMarker, feature, trial] of enableFeatures.matchAll(
    /(\*)?([^.:,<]+)(?:<([^.:,<]+))?(?:\.[^.:,]+)?(?::[^,:,]*)?,?/g
  )) {
    if (!trials.hasOwnProperty(trial)) {
      continue
    }
    trials[trial].features[feature] = defaultMarker ? 'default' : 'enabled'
  }

  const disableFeatures = switches['disable-features'] ?? ''
  for (let [_, feature, trial] of disableFeatures.matchAll(
    /([^.:,<]+)(?:<([^.:,<]+))?(?:\.[^.:,]+)?(?::[^,:,]*)?,?/g
  )) {
    if (!trials.hasOwnProperty(trial)) {
      continue
    }
    trials[trial].features[feature] = 'disabled'
  }

  return trials
}

export function trialsFromCommandLine(args) {
  return buildTrials(extractSwitches(splitCommandLine(args)))
}
