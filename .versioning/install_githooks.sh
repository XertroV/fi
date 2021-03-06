#!/usr/bin/env bash


# Reliable way for a bash script to get the full path to itself?
# http://stackoverflow.com/questions/4774054/reliable-way-for-a-bash-script-to-get-the-full-path-to-itself
pushd `dirname $0` > /dev/null
SCRIPT_FOLDER_PATH=`pwd`
popd > /dev/null

configuration_file=$1

# Ensure the configuration file provided is valid
#if ! $SCRIPT_FOLDER_PATH/scripts/utilities.sh $configuration_file
#then
#    exit 1
#fi

# Whether we are dealing with a git-submodule or not, this get the correct git file path for the
# project root folder if run on it directory, or for the sub-module folder if run on its directory.
cd $SCRIPT_FOLDER_PATH
cd ..

GIT_DIR_="$(git rev-parse --git-dir)"
gitHooksPath="$GIT_DIR_/hooks"


# Remove the '/app/blabla/' from the $SCRIPT_FOLDER_PATH variable to get its base folder name.
# https://regex101.com/r/rR0oM2/1
AUTO_VERSIONING_ROOT_FOLDER_NAME=$(echo $SCRIPT_FOLDER_PATH | sed -r "s/((.+\/)+)//")

# Get the folder to the auto-versioning scripts from the git root directory.
AUTO_VERSIONING_ROOT_FOLDER_PATH="$(git rev-parse --show-prefix)$AUTO_VERSIONING_ROOT_FOLDER_NAME"

# echo
# echo "pwd                             : $(pwd)"
# echo "GIT_DIR_                        : $GIT_DIR_"
# echo "gitHooksPath                    : $gitHooksPath"
# echo "configuration_file              : $configuration_file"
# echo "SCRIPT_FOLDER_PATH              : $SCRIPT_FOLDER_PATH"
# echo "AUTO_VERSIONING_ROOT_FOLDER_NAME: $AUTO_VERSIONING_ROOT_FOLDER_NAME"
# echo "AUTO_VERSIONING_ROOT_FOLDER_PATH: $AUTO_VERSIONING_ROOT_FOLDER_PATH"

if [ -d $gitHooksPath ]
then
    printf "Installing the githooks...\n\n"

    # Set the scripts file prefix
    scripts_folder_prefix="scripts"

    # Write specify the githooks' root folder
    echo "$AUTO_VERSIONING_ROOT_FOLDER_PATH/$scripts_folder_prefix,$configuration_file," > $gitHooksPath/gitHooksRoot.txt

    # Declare an array variable
    # You can access them using echo "${arr[0]}", "${arr[1]}"
    declare -a git_hooks_file_list=( "post-checkout" "post-commit" "prepare-commit-msg" )

    # Now loop through the above array
    for current_file in "${git_hooks_file_list[@]}"
    do
        if ! cp -v "$SCRIPT_FOLDER_PATH/$scripts_folder_prefix/$current_file" $gitHooksPath
        then
            printf "\nERROR when installing \`$current_file\` file from:\n"
            printf "\`$SCRIPT_FOLDER_PATH/$scripts_folder_prefix\` to \`$gitHooksPath\`.\n"
            exit 1
        fi
    done

    printf "\nThe githooks are successfully installed!\n"
else
    printf "Error! Could not to install the githooks.\n"
    printf "The git hooks folder \`$gitHooksPath\` folder is missing.\n\n"
    exit 1
fi


# Exits the program using a successful exit status code.
exit 0



