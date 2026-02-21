export type SupportedShell = 'bash' | 'zsh' | 'fish';

const BASH_SCRIPT = `# memograph bash completion
_memograph_completion() {
  local cur prev cmd
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmd="\${COMP_WORDS[1]}"

  if [[ "\${prev}" == "-i" || "\${prev}" == "--input" ]]; then
    compopt -o filenames -o nospace 2>/dev/null
    COMPREPLY=( $(compgen -f -- "\${cur}") )
    return 0
  fi

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "inspect interactive completion help" -- "\${cur}") )
    return 0
  fi

  if [[ "\${cmd}" == "completion" && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
    return 0
  fi

  if [[ "\${cmd}" == "inspect" ]]; then
    COMPREPLY=( $(compgen -W "-i --input --json --max-messages --analyze-mode --api-url --api-timeout-ms --api-retries --llm-provider --llm-model --llm-api-key --llm-base-url --llm-temperature --llm-max-tokens -h --help" -- "\${cur}") )
  fi
}

complete -F _memograph_completion memograph
`;

const ZSH_SCRIPT = `#compdef memograph
_memograph() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments -C \
    '1:command:(inspect interactive completion help)' \
    '*::args:->args'

  case $words[2] in
    inspect)
      if [[ $words[CURRENT-1] == "-i" || $words[CURRENT-1] == "--input" ]]; then
        _files -/
        return
      fi
      _values 'inspect options' \
        '-i[Path to transcript JSON file]' \
        '--input[Path to transcript JSON file]' \
        '--json[Output JSON]' \
        '--max-messages[Cap number of messages processed]' \
        '--analyze-mode[Analysis mode]' \
        '--api-url[Custom analyze API URL]' \
        '--api-timeout-ms[Analyze API timeout]' \
        '--api-retries[Analyze API retry count]' \
        '--llm-provider[LLM provider]' \
        '--llm-model[LLM model]' \
        '--llm-api-key[LLM API key]' \
        '--llm-base-url[Custom base URL]' \
        '--llm-temperature[LLM temperature]' \
        '--llm-max-tokens[Maximum LLM tokens]'
      ;;
    completion)
      _values 'shell' bash zsh fish
      ;;
  esac
}

_memograph "$@"
`;

const FISH_SCRIPT = `# memograph fish completion
complete -c memograph -f
complete -c memograph -n "__fish_use_subcommand" -a "inspect interactive completion help"
complete -c memograph -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"

complete -c memograph -n "__fish_seen_subcommand_from inspect" -s i -l input -d "Path to transcript JSON file" -r -F
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l json -d "Output JSON (machine-readable)"
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l max-messages -d "Cap number of messages processed" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l analyze-mode -d "Analysis mode (hosted or llm)" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l api-url -d "Hosted analyze API URL" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l api-timeout-ms -d "Hosted analyze API timeout in ms" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l api-retries -d "Hosted analyze API retry count" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-provider -d "LLM provider" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-model -d "LLM model" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-api-key -d "LLM API key" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-base-url -d "Custom LLM base URL" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-temperature -d "LLM temperature" -r
complete -c memograph -n "__fish_seen_subcommand_from inspect" -l llm-max-tokens -d "Maximum LLM tokens" -r
`;

export function getCompletionScript(shell: SupportedShell): string {
  if (shell === 'bash') {
    return BASH_SCRIPT;
  }

  if (shell === 'zsh') {
    return ZSH_SCRIPT;
  }

  return FISH_SCRIPT;
}
